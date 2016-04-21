var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.scaleUpPolicy) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    asgName = job.stack.assets.pending.autoScalingGroup,
    policyName = 'IncreaseCapacity';
  autoscaling.putScalingPolicy({
    AdjustmentType: 'PercentChangeInCapacity',
    AutoScalingGroupName: asgName,
    PolicyName: policyName,
    ScalingAdjustment: 50,
    Cooldown: 300,
    MinAdjustmentStep: 2
  }, function (err, data) {
    if (err) return cb(new error.AmazonError('autoscaling.putScalingPolicy', err));
    logger.info('created scale up policy', data.PolicyARN, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.scaleUpPolicy': data.PolicyARN}, cb
    );
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};