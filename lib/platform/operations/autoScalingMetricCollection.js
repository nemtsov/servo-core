var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    asgName = job.stack.assets.pending.autoScalingGroup;
  autoscaling.enableMetricsCollection({
    AutoScalingGroupName: asgName,
    Granularity: '1Minute'
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.enableMetricsCollection', err));
    logger.info('enabled auto scaling group metric collection', asgName, job.deploy.id);
    cb();
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};