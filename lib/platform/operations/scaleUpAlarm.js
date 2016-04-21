var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.scaleUpAlarm) return cb();
  var cloudwatch = amazonSvc.service('CloudWatch'),
    alarmName = settings.baseHandle + ':' + job.app.handle + ':' +
      job.stack.handle + ':scaleup:' + job.deploy.id,
    policyName = job.stack.assets.pending.scaleUpPolicy,
    asgName = job.stack.assets.pending.autoScalingGroup,
    threshold = null,
    duration = null;

  job.deploy.config.forEach(function (entry) {
    if (entry.key === 'ScaleUpThreshold') threshold = entry.value;
    if (entry.key === 'ScaleUpDuration') duration = entry.value;
  });

  cloudwatch.putMetricAlarm({
    AlarmName: alarmName,
    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    EvaluationPeriods: duration,
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/EC2',
    Period: 60,
    Statistic: 'Average',
    Threshold: threshold,
    ActionsEnabled: true,
    AlarmActions: [policyName],
    Dimensions: [{Name: 'AutoScalingGroupName', Value: asgName}]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.putMetricAlarm', err));
    logger.info('created scale up alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.scaleUpAlarm': alarmName}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var alarmName = job.stack.assets.pending.scaleUpAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted scale up alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.scaleUpAlarm': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var alarmName = job.stack.assets.active.scaleUpAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted scale up alarm', alarmName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.scaleUpAlarm': null}, cb
    );
  });
};