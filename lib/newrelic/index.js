var db = require('_/db'),
  error = require('_/error'),
  configSvc = require('_/config'),
  settings = require('_/settings'),
  logger = require('_/logger')('newrelic'),
  request = require('request'),
  async = require('async');

function getHandle (context, cb) {
  async.auto({
    app: db.apps.findById.bind(db.apps, context.appId),
    stack: db.stacks.findById.bind(db.stacks, context.stackId),
    handle: ['app', 'stack', function (done, contexts) {
      done(null, settings.org + ':' + settings.region + ':' + contexts.app.handle + ':' + contexts.stack.handle);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    cb(null, results.handle);
  });
}

function getCredentials (context, cb) {
  var appId = context.appId,
    stackId = context.stackId,
    deployId = context.deployId;

  function arrayToObject (array) {
    var object = {};
    array.forEach(function (item) {
      object[item.key] = {
        value: item.value,
        encrypted: item.encrypted
      };
    });
    return object;
  }

  if (deployId)
    db.deploys.findById(deployId, function (err, deployment) {
      if (err) return cb(err);
      var config = arrayToObject(deployment.config);

      if (!config.NewRelicApiKey || !config.NewRelicAccountId)
        return cb(new error.ServoError("NewRelic is not configured"));

      cb(null, {
        apiKey: config.NewRelicApiKey.encrypted ?
                  configSvc.decrypt(config.NewRelicApiKey.value) :
                  config.NewRelicApiKey.value,
        accountId: config.NewRelicAccountId.encrypted ?
                      configSvc.decrypt(config.NewRelicAccountId.value) :
                      config.NewRelicAccountId.value
      });
    });
  else
    async.auto({
      globalConfig: configSvc.list.bind(null, 'global', null),
      appConfig: configSvc.list.bind(null, 'app', appId),
      stackConfig: configSvc.list.bind(null, 'stack', stackId),
      credentials: ['globalConfig', 'appConfig', 'stackConfig', function (done, results) {
        var globalConfig = arrayToObject(results.globalConfig),
          appConfig = arrayToObject(results.appConfig),
          stackConfig = arrayToObject(results.stackConfig),
          credentials = {
            apiKey: globalConfig.NewRelicApiKey,
            accountId: globalConfig.NewRelicAccountId
          };

        if (appConfig.NewRelicApiKey) {
          credentials.apiKey = appConfig.NewRelicApiKey;
          credentials.accountId = appConfig.NewRelicAccountId;
        }

        if (stackConfig.NewRelicApiKey) {
          credentials.apiKey = appConfig.stackConfig;
          credentials.accountId = appConfig.stackConfig;
        }

        if (!credentials.apiKey || !credentials.accountId)
         return done(new error.ServoError("NewRelic is not configured"));

        try {
          if (credentials.apiKey.encrypted)
            credentials.apiKey.value = configSvc.decrypt(credentials.apiKey.value);
          if (credentials.accountId.encrypted)
            credentials.accountId.value = configSvc.decrypt(credentials.accountId.value);
          credentials.apiKey = credentials.apiKey.value;
          credentials.accountId = credentials.accountId.value;
        } catch (e) {
          return done(e);
        }

        done(null, credentials);
      }]
    }, function (err, results) {
      if (err) return cb(err);
      cb(null, results.credentials);
    });
}

exports.getCredentials = getCredentials;

function apiRequest (endPoint, apiKey, filter, cb) {
  if (typeof cb !== 'function') {
    if (typeof filter !== 'function')
      return ;
    cb = filter;
    filter = {}
  }

  request.get('https://api.newrelic.com/v2/' + endPoint + '.json', {
    headers: {
      'X-Api-Key': apiKey
    },
    form: filter
  }, function (err, result) {
    var body = null;

    if (err) return cb(new error.ServoError('Error from the New Relic API', err));

    try {
      body = JSON.parse(result.body);
    } catch (err) {
      if (err) return cb(new error.ServoError('Can not parse new relic data', result.body));
    }

    if (!body[endPoint])
      return cb(new error.ServoError('Malformed new relic response', result.body));

    cb(null, body);
  });
}

exports.apiRequest = apiRequest;

exports.getLink = function (context, cb) {
  async.auto({
    credentials: getCredentials.bind(null, {appId: context.appId, stackId: context.stackId}),
    app: db.apps.findById.bind(db.apps, context.appId),
    stack: db.stacks.findById.bind(db.stacks, context.stackId),
    newRelicAppId: ['credentials', 'app', 'stack', function (done, results) {
      apiRequest('applications', results.credentials.apiKey, {
        'filter[name]': settings.org + ':' + settings.region + ':' + results.app.handle + ':' + results.stack.handle
      }, function (err, result) {
        if (err) return done(err);
        var applications = result.applications;

        if (applications.length !== 1)
          return done(new error.ServoError("Wrong number of applications in the New Relic",
            JSON.stringify(applications)));

        done(null, applications[0].id);
      });
    }]
  }, function (err, results) {
    if (err) return cb(err);
    var accountId = results.credentials.accountId,
      newRelicAppId = results.newRelicAppId;
    cb(null, 'https://rpm.newrelic.com/accounts/' + accountId + "/applications/" + newRelicAppId);
  });
};

exports.postDeploymentEvent = function (message, context) {
  async.auto({
    credentials: getCredentials.bind(null, context),
    handle: getHandle.bind(null, context),
    request: ['credentials', 'handle', function (done, results) {
      request.post('https://api.newrelic.com/deployments.xml', {
        headers: {
          'x-api-key': results.credentials.apiKey
        },
        form: {
          'deployment[app_name]': results.handle,
          'deployment[description]': message,
          'deployment[user]': 'Servo'
        }
      }, done);
    }]
  }, function (err, results) {
    if (err) logger.error(err);
  });
};

exports.saveNewRelicLink = function (context) {
  async.auto({
    link: function (done) {
      exports.getLink(context, done);
    },
    update: ['link', function (done, data) {
      db.stacks.updateById(context.stackId, {'assets.active.newRelicLink': data.link}, done)
    }]
  }, function (err, results) {
    if (err) logger.error(err);
  });
}

module.exports = exports;
