var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.statusCheckAlarm) return cb();
  var cloudwatch = amazonSvc.service('CloudWatch'),
    alarmName = settings.baseHandle + ':' + job.app.handle + ':' +
      job.stack.handle + ':statuscheck:' + job.deploy.id,
    asgName = job.stack.assets.pending.autoScalingGroup,
    snsTopic = job.stack.assets.pending.snsTopic ||
      job.stack.assets.active.snsTopic;

  cloudwatch.putMetricAlarm({
    AlarmName: alarmName,
    ComparisonOperator: 'GreaterThanThreshold',
    EvaluationPeriods: 1,
    MetricName: 'StatusCheckFailed',
    Namespace: 'AWS/EC2',
    Period: 60,
    Statistic: 'Average',
    Threshold: 0,
    ActionsEnabled: true,
    AlarmActions: [snsTopic],
    OKActions: [snsTopic],
    Dimensions: [{Name: 'AutoScalingGroupName', Value: asgName}]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.putMetricAlarm', err));
    logger.info('created status check alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.statusCheckAlarm': alarmName}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var alarmName = job.stack.assets.pending.statusCheckAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted status check alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.statusCheckAlarm': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var alarmName = job.stack.assets.active.statusCheckAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted status check alarm', alarmName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.statusCheckAlarm': null}, cb
    );
  });
};