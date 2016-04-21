var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.autoScalingGroup) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    launchConfigName = job.stack.assets.pending.launchConfiguration,
    loadBalancerInternal = job.stack.assets.pending.loadBalancerInternalName ||
      job.stack.assets.active.loadBalancerInternalName,
    loadBalancerPublic = job.stack.assets.pending.loadBalancerPublicName ||
      job.stack.assets.active.loadBalancerPublicName,
    asgName = launchConfigName,
    minSize, maxSize;

  job.deploy.config.forEach(function (entry) {
    if (entry.key === 'MinWorkers') minSize = entry.value;
    if (entry.key === 'MaxWorkers') maxSize = entry.value;
  });

  async.auto({
    currentCapacity: function (cb) {
      var activeAutoScalingGroup = job.stack.assets.pending.autoScalingGroup;
      if (!activeAutoScalingGroup) return cb();
      autoscaling.describeAutoScalingGroups({
        AutoScalingGroupNames: [activeAutoScalingGroup]
      }, function (err, data) {
        if (err) return cb(err);
        if (!data.AutoScalingGroups[0]) return cb(new Error('active auto scaling group not found'));
        cb(null, data.AutoScalingGroups[0].DesiredCapacity);
      });
    },
    create: ['currentCapacity', function (cb, results) {
      var capacity = results.currentCapacity || minSize;
      if (results.currentCapacity > maxSize) capacity = maxSize;
      if (results.currentCapacity < minSize) capacity = minSize;
      autoscaling.createAutoScalingGroup({
        AutoScalingGroupName: asgName,
        MinSize: minSize,
        MaxSize:  maxSize,
        DesiredCapacity: capacity,
        LaunchConfigurationName: launchConfigName,
        VPCZoneIdentifier: [settings.sharedSubnets[0], settings.sharedSubnets[1]].join(','),
        LoadBalancerNames: [loadBalancerInternal, loadBalancerPublic],
        TerminationPolicies: ['ClosestToNextInstanceHour'],
        Tags: [
          {
            Key: 'Name',
            Value: settings.baseHandle + ':' + job.app.handle + ':' + job.stack.handle,
            PropagateAtLaunch: true
          },
          {
            Key: 'DeployId',
            Value: job.deploy.id,
            PropagateAtLaunch: true
          }
        ]
      }, cb);
    }]
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.createAutoScalingGroup', err));
    logger.info('created auto scaling group', asgName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.autoScalingGroup': asgName}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var asgName = job.stack.assets.pending.autoScalingGroup,
    autoscaling = amazonSvc.service('AutoScaling');
  if (!asgName) return cb();
  autoscaling.deleteAutoScalingGroup({
    AutoScalingGroupName: asgName,
    ForceDelete: true
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.deleteAutoScalingGroup', err));
    logger.info('deleted auto scaling group', asgName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.autoScalingGroup': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var asgName = job.stack.assets.active.autoScalingGroup,
    autoscaling = amazonSvc.service('AutoScaling');
  if (!asgName) return cb();
  autoscaling.deleteAutoScalingGroup({
    AutoScalingGroupName: asgName,
    ForceDelete: true
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.deleteAutoScalingGroup', err));
    logger.info('deleted auto scaling group', asgName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.autoScalingGroup': null}, cb
    );
  });
};