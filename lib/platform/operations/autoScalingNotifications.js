var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    asgName = job.stack.assets.pending.autoScalingGroup,
    snsTopic = job.stack.assets.pending.snsTopic ||
      job.stack.assets.active.snsTopic;
  autoscaling.putNotificationConfiguration({
    AutoScalingGroupName: asgName,
    NotificationTypes: [
      'autoscaling:EC2_INSTANCE_LAUNCH',
      'autoscaling:EC2_INSTANCE_LAUNCH_ERROR',
      'autoscaling:EC2_INSTANCE_TERMINATE',
      'autoscaling:EC2_INSTANCE_TERMINATE_ERROR'
    ],
    TopicARN: snsTopic
  }, cb);
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};