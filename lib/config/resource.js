var configSvc = require('./index'),
  Config = require('./model'),
  error = require('_/error'),
  async = require('async'),
  eventSvc = require('_/event'),
  db = require('_/db');

exports.getAll = function (req, res, next) {
  var scope = determineScope(req);
  configSvc.list(scope.level, scope.context, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.get = function(req, res, next) {
  var scope = determineScope(req),
    id = req.params.configId;

  async.auto({
    current: db.configs.findById.bind(db.configs, id),
    verify: ['current', function (cb, results) {
      if (results.current.level !== scope.level) return cb(new error.NotFoundError());
      if (results.current.context !== scope.context) return cb(new error.NotFoundError());
      cb();
    }],
    decrypt: ['verify', function(cb, results) {
      var current = results.current;
      if (!current.secret) return cb(null, current);
      current.value = configSvc.decrypt(current.value);
      current.secret = false;
      current.decrypted = true;
      cb(null, current);
    }]
  }, function (err, results) {
    (err) ? next(err) : res.send(results.decrypt);
  });
}

function publishEvent (req, config, cb) {
  var message = 'Config ' + config.key,
    context = {configId: config.id};
  switch (req.method) {
    case 'POST':
      message = message + ' is created';
      break;
    case 'PUT' :
      message = message + ' is updated';
      break;
    case 'DELETE' :
      message = message + ' is deleted';
      break;
  }

  if (!config.secret && !req.method.match('DELETE'))
    message = message + (req.method.match('POST') ? ' with value ' : ' to value ') + config.value;

  switch (config.level) {
    case 'global':
      message = message + ' in global config';
      break;
    case 'app':
      message = message + ' in app {{app}}';
      context.appId = req.context.app.id;
      break;
    case 'stack':
      message = message + ' in stack {{stack}}';
      context.appId = req.context.app.id;
      context.stackId = req.context.stack.id;
      break;
  }

  eventSvc.publish('ConfigChange', message, context, cb);
}

exports.post = function (req, res, next) {
  var scope = determineScope(req),
    key = req.body.key,
    value = req.body.value,
    secret = (req.body.secret === true),
    md5 = req.body.md5;

  async.auto({
    created: function (done) {
      configSvc.create(scope.level, scope.context, req.context, key, value, secret, md5, done);
    },
    publishEvent: ['created', function (cb, results) {
      publishEvent(req, results.created, cb);
    }]
  }, function (err, result) {
    (err) ? next(err) : res.send(result.created);
  });
};

exports.put = function (req, res, next) {
  var scope = determineScope(req),
    id = req.params.configId,
    value = req.body.value;

  async.auto({
    current: db.configs.findById.bind(db.configs, id),
    verify: ['current', function (cb, results) {
      if (results.current.level !== scope.level) return cb(new error.NotFoundError());
      if (results.current.context !== scope.context) return cb(new error.NotFoundError());
      cb();
    }],
    update: ['verify', function (cb, results) {
      var current  = results.current;
      var newEntry = new Config(current.level, current.context, current.key, value, current.secret);
      db.configs.updateById.apply(db.configs, [id, {value: newEntry.value}, cb]);
    }],
    publishEvent: ['update', function (cb, results) {
      results.current.value = value;
      publishEvent(req, results.current, cb);
    }],
    config: ['update', db.configs.findById.bind(db.configs, id)]
  }, function (err, results) {
    (err) ? next(err) : res.send(results.config);
  });
};

exports.del = function (req, res, next) {
  var scope = determineScope(req),
    id = req.params.configId;
  async.auto({
    config: db.configs.findById.bind(db.configs, id),
    verify: ['config', function (cb, results) {
      if (results.config.level !== scope.level) return cb(new error.NotFoundError());
      if (results.config.context !== scope.context) return cb(new error.NotFoundError());
      cb();
    }],
    remove: ['verify', db.configs.removeById.bind(db.configs, id)],
    publishEvent: ['remove', function (cb, results) {
      publishEvent(req, results.config, cb);
    }]
  }, function (err) {
    (err) ? next(err) : res.status(204).end();
  });
};

function determineScope(req) {
  var level = 'global',
    context;
  if (!req.context) return {level: level, context: null};
  if (req.context.app) {
    level = 'app';
    context = req.context.app.id;
  }
  if (req.context.stack) {
    level = 'stack';
    context = req.context.stack.id;
  }
  return {level: level, context: context};
}
