var db = require('_/db'),
  async = require('async'),
  deploySvc = require('_/deploy'),
  queueSvc = require('_/queue'),
  error = require('_/error'),
  logger = require('_/logger')('platform');

exports.initiateSetup = function (deploy, build, properties, cb) {
  var job = {
    action: 'setup',
    stackId: deploy.stackId,
    appId: deploy.appId,
    deploy: deploy,
    build: build,
    properties: properties || {},
    pending: [
      'iamRole',
      'iamInstanceProfile',
      'instanceSecurityGroup', //TODO common security group rules
      'loadBalancerSecurityGroup',
      'snsTopic',
      'snsTopicSubscription',
      'iamRolePolicy',
      'loadBalancerInternal',
      'loadBalancerPublic',
      'loadBalancerHealthCheck',
      'loadBalancerAttributes',
      'hostname',
      'environmentVariables',
      'imageId',
      'launchConfiguration',
      'autoScalingGroup',
      'instanceInboundRules',
      'autoScalingMetricCollection',
      'scaleUpPolicy',
      'scaleDownPolicy',
      'scaleUpAlarm',
      'scaleDownAlarm',
      'healthyHostAlarm',
      'statusCheckAlarm',
      'autoScalingNotifications',
      'applicationHealth',
      'completion'
    ],
    complete: []
  };
  queueSvc.enqueue('_/platform', 'handleJob', job, cb);
};

exports.initiateDestroy = function (stackId, appId, cb) {
  var job = {
    action: 'destroy',
    stackId: stackId,
    appId: appId,
    pending: [
      'statusCheckAlarm',
      'healthyHostAlarm',
      'scaleDownAlarm',
      'scaleUpAlarm',
      'autoScalingGroup',
      'instanceSecurityGroup',
      'launchConfiguration',
      'iamRolePolicy',
      'iamInstanceProfile',
      'iamRole',
      'hostname',
      'loadBalancerInternal',
      'loadBalancerPublic',
      'snsTopic',
      'loadBalancerSecurityGroup'
    ],
    complete: []
  };
  queueSvc.enqueue('_/platform', 'handleJob', job, cb);
};

exports.validateManifest = function (manifest, cb) {
  var platform;
  if (!manifest.platform) return cb(new error.BadInputError('platform is required in manifest'));
  try {
    platform = require('./types/' + manifest.platform)
  } catch (err) {
    return cb(new error.BadInputError('invalid platform in manifest'));
  }
  platform.validateManifest(manifest, cb);
};

exports.handleJob = function (job, cb) {
  var operation = job.pending.shift();
  async.auto({
    stack: db.stacks.findById.bind(db.stacks, job.stackId),
    app: db.apps.findById.bind(db.apps, job.appId),
    dispatch: ['stack', 'app', function (cb, results) {
      logger.debug('platform job', {
        app: results.app.id,
        stack: results.stack.id,
        action: job.action,
        operation: operation
      });
      job.stack = results.stack;
      job.app = results.app;
      require('./operations/' + operation)[job.action](job, cb);
    }]
  }, function (err, data) {
    delete job.stack;
    delete job.app;
    if (err) return handleJobError(job, operation, err, cb);
    if (data && data.dispatch && data.dispatch.retry)
      return handleJobRetry(data.dispatch.retry, job, operation, cb);
    handleJobCompletion(job, operation, cb);
  });
};

function handleJobCompletion(job, operation, cb) {
  if (!job.pending.length) {
    logger.info('completed platform ' + job.action + ' of ' + job.stackId);
    return async.auto({
      clearPendingAssets: function (cb) {
        db.stacks.updateById(job.stackId, {'assets.pending': {}}, cb);
      },
      setState: ['clearPendingAssets', function (cb) {
        if (!job.deploy) return cb();
        deploySvc.setState(
          job.deploy.id,
          (job.action === 'revert') ? 'FAILED' : 'COMPLETE',
          operation + ' ' + job.action + ' completed',
          cb
        );
      }]
    }, cb);
  }
  if (job.action !== 'revert') job.complete.push(operation);
  async.auto({
    setState: function (cb) {
      if (!job.deploy) return cb();
      deploySvc.setState(
        job.deploy.id,
        (job.action === 'revert') ? 'REVERTING' : 'PENDING',
        operation + ' ' + job.action + ' completed',
        cb
      );
    },
    enqueue: ['setState', queueSvc.enqueue.bind(queueSvc, '_/platform', 'handleJob', job)]
  }, cb);
}

function handleJobError(job, operation, err, cb) {
  var reason;
  if (job.action === 'destroy' || job.action === 'revert') return cb(err);
  reason = operation + ' ' + job.action + ' yielded ' + err.message;
  job.action = 'revert';
  job.complete.push(operation);
  job.pending = job.complete.reverse();
  delete job.complete;
  logger.warn(err, {deployId: job.deploy.id});
  return async.auto({
    setState: deploySvc.setState.bind(deploySvc, job.deploy.id, 'REVERTING', reason),
    enqueue: ['setState', queueSvc.enqueue.bind(queueSvc, '_/platform', 'handleJob', job)]
  }, cb);
}

function handleJobRetry(delay, job, operation, cb) {
  job.pending.unshift(operation);
  queueSvc.enqueue('_/platform', 'handleJob', job, {delay: delay}, cb);
}
