var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.healthyHostAlarm ||
    job.stack.assets.active.healthyHostAlarm) return cb();
  var cloudwatch = amazonSvc.service('CloudWatch'),
    alarmName = settings.baseHandle + ':' + job.app.handle + ':' +
      job.stack.handle + ':healthyhost:' + job.deploy.id,
    publicLoadBalancer = job.stack.assets.pending.loadBalancerPublicName,
    snsTopic = job.stack.assets.pending.snsTopic ||
      job.stack.assets.active.snsTopic;

  cloudwatch.putMetricAlarm({
    AlarmName: alarmName,
    ComparisonOperator: 'LessThanThreshold',
    EvaluationPeriods: 1,
    MetricName: 'HealthyHostCount',
    Namespace: 'AWS/ELB',
    Period: 60,
    Statistic: 'Minimum',
    Threshold: 1,
    ActionsEnabled: true,
    AlarmActions: [snsTopic],
    OKActions: [snsTopic],
    Dimensions: [
      {Name: 'LoadBalancerName', Value: publicLoadBalancer}
      //TODO think about monitoring internal load balancer as well
    ]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.putMetricAlarm', err));
    logger.info('created healthy host alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.healthyHostAlarm': alarmName}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var alarmName = job.stack.assets.pending.healthyHostAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted healthy host alarm', alarmName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.healthyHostAlarm': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var alarmName = job.stack.assets.active.healthyHostAlarm,
    cloudwatch = amazonSvc.service('CloudWatch');
  if (!alarmName) return cb();
  cloudwatch.deleteAlarms({
    AlarmNames: [alarmName]
  }, function (err) {
    if (err) return cb(new error.AmazonError('cloudwatch.deleteAlarms', err));
    logger.info('deleted healthy host alarm', alarmName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.healthyHostAlarm': null}, cb
    );
  });
};