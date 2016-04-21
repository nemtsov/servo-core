var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (!job.stack.assets.pending || !Object.keys(job.stack.assets.pending).length) return cb();
  var autoScalingGroup = require('./autoScalingGroup'),
    launchConfiguration = require('./launchConfiguration'),
    iamInstanceProfile = require('./iamInstanceProfile'),
    iamRolePolicy = require('./iamRolePolicy'),
    iamRole = require('./iamRole'),
    scaleUpAlarm = require('./scaleUpAlarm'),
    scaleDownAlarm = require('./scaleDownAlarm'),
    statusCheckAlarm = require('./statusCheckAlarm');
  async.auto({
    autoScalingGroup: autoScalingGroup.destroy.bind(autoScalingGroup, job),
    launchConfiguration: ['autoScalingGroup', launchConfiguration.destroy.bind(launchConfiguration, job)],
    iamInstanceProfile: iamInstanceProfile.destroy.bind(iamInstanceProfile, job),
    iamRolePolicy: iamRolePolicy.destroy.bind(iamRolePolicy, job),
    iamRole: ['iamInstanceProfile', 'iamRolePolicy', iamRole.destroy.bind(iamRole, job)],
    scaleUpAlarm: scaleUpAlarm.destroy.bind(scaleUpAlarm, job),
    scaleDownAlarm: scaleDownAlarm.destroy.bind(scaleDownAlarm, job),
    statusCheckAlarm: statusCheckAlarm.destroy.bind(statusCheckAlarm, job)
  }, function (cleanupErr) {
    db.stacks.findById(job.stack.id, function (err, stack) {
      if (cleanupErr) logger.error('error on deployment cleanup', cleanupErr, stack.assets);
      //TODO publish cleanup failure event
      if (stack.assets.pending.snsTopicSubscription) delete stack.assets.pending.snsTopicSubscription;
      Object.keys(stack.assets.pending).forEach(function (key) {
        stack.assets.active[key] = stack.assets.pending[key];
      });
      stack.assets.pending = {};
      db.stacks.save(stack, cb);
    });
  });
};
