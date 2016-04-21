var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.scaleDownPolicy) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    asgName = job.stack.assets.pending.autoScalingGroup,
    policyName = 'DecreaseCapacity';
  autoscaling.putScalingPolicy({
    AdjustmentType: 'ChangeInCapacity',
    AutoScalingGroupName: asgName,
    PolicyName: policyName,
    ScalingAdjustment: -1,
    Cooldown: 300
  }, function (err, data) {
    if (err) return cb(new error.AmazonError('autoscaling.putScalingPolicy', err));
    logger.info('created scale down policy', data.PolicyARN, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.scaleDownPolicy': data.PolicyARN}, cb
    );
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};