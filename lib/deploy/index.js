var async = require('async'),
  db = require('_/db'),
  Deploy = require('./model'),
  configSvc = require('_/config'),
  eventSvc = require('_/event'),
  error = require('_/error'),
  logger = require('_/logger')('deploy');

exports.start = function (appId, stackId, buildId, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  async.auto({
    stack: db.stacks.findOne.bind(db.stacks, {id: stackId}),
    build: db.builds.findById.bind(db.builds, buildId),
    config: configSvc.listResolved.bind(configSvc, appId, stackId),
    previous: db.deploys.find.bind(db.deploys, {stackId: stackId, state: "COMPLETE"}, {limit: 1}),
    index: db.deploys.ensureIndex.bind(db.deploys, 'lock', {unique: true, sparse: true}),
    save: ['stack', 'index', 'config', 'previous', function (cb, results) {
      var deploy, lastDeploy;
      try {
        deploy = new Deploy(appId, stackId, buildId, results.config, options.description);
      } catch (err) {
        cb(err);
      }
      lastDeploy = results.previous[0];
      if (lastDeploy && lastDeploy.id) {
        deploy.previousDeploy = lastDeploy.id;
      }
      db.deploys.save(deploy, cb);
    }],
    start: ['build', 'save', function (cb, results) {
      var platform = results.build.manifest.platform,
        message, module;
      try {
        module = require('_/platform/types/' + platform);
      } catch (err) {
        message = 'invalid platform ' + platform + ' in manifest';
        return cb(new error.BadInputError(message));
      }
      module.deploy(results.save, results.build, cb);
    }],
    publishEvent: ['start', function (cb, results) {
      eventSvc.publish('DeployStarted', 'Deploy {{deploy}} started', {
        deployId: results.save.id,
        appId: appId,
        stackId: stackId,
        buildId: buildId
      }, cb);
    }]
  }, function (err, results) {
    if (err && err.name === 'ConflictError')
      err.message = 'another deploy is in progress';
    if (err && results.save)
      setState(results.save.id, 'FAILED', err.message);
    (err) ? cb(err) : cb(null, results.save);
  });
};

exports.destroyByStackId = function (stackId, cb) {
  async.auto({
    deploys: db.deploys.find.bind(db.deploys, {stackId: stackId}),
    destroy: ['deploys', function (cb, results) {
      async.each(results.deploys, function (deploy, cb) {
        db.deploys.destroyById(deploy.id, cb);
      }, cb);
    }]
  }, cb);
};

exports.setState = setState;

function setState(deployId, state, stateReason, cb) {
  logger.debug('deploy state change', deployId, state, stateReason);
  async.auto({
    originalState: function (cb) {
      db.deploys.findById(deployId, function (err, deploy) {
        (err) ? cb(err) : cb(null, deploy.state);
      });
    },
    state: ['originalState', function (cb, results) {
      var update = {state: state, stateReason: stateReason};
      if (state === 'REVERTING' && results.originalState !== 'REVERTING') update.failureReason = stateReason;
      db.deploys.updateById(deployId, update, cb);
    }],
    deploy: ['state', db.deploys.findById.bind(db.deploys, deployId)],
    lock: ['state', 'deploy', function (cb, results) {
      if (state !== 'COMPLETE' && state !== 'FAILED') return cb();
      logger.info('releasing deploy lock on ' + results.deploy.stackId);
      delete results.deploy.lock;
      db.deploys.save(results.deploy, cb);
    }],
    publishEvent: ['state', 'deploy', function (cb, results) {
      if (state === results.originalState) return cb();
      var deploy = results.deploy;
      switch (state) {
        case 'COMPLETE':
          eventSvc.publish('DeploySuccess', 'Deploy {{deploy}} complete', {
            deployId: deploy.id,
            appId: deploy.appId,
            stackId: deploy.stackId,
            buildId: deploy.buildId
          }, cb);
          break;
        case 'FAILED':
          eventSvc.publish('DeployFailure', 'Deploy {{deploy}} failed', {
            deployId: results.deploy.id,
            appId: deploy.appId,
            stackId: deploy.stackId,
            buildId: deploy.buildId
          }, {severity: 'warn'}, cb);
          break;
        default:
          cb();
      }
    }]
  }, cb);
}
