var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    elb = amazonSvc.service('ELB'),
    timeoutMinutes = 10, //TODO make a config property
    timeoutInMs = timeoutMinutes * 60 * 1000,
    timeout = job.deploy._createdAt + timeoutInMs,
    asgName = job.stack.assets.pending.autoScalingGroup,
    loadBalancerPublic = job.stack.assets.pending.loadBalancerPublicName ||
      job.stack.assets.active.loadBalancerPublicName;
  logger.info('checking application health', job.deploy.id);
  if (!asgName) return cb();
  async.auto({
    asg: autoscaling.describeAutoScalingGroups.bind(
      autoscaling, {AutoScalingGroupNames: [asgName]}
    ),
    health: ['asg', function (cb, results) {
      var instances = [],
        asg = results.asg.AutoScalingGroups[0],
        capacity = asg.DesiredCapacity;
      asg.Instances.forEach(function (instance) {
        instances.push({InstanceId: instance.InstanceId});
      });
      if (!instances.length) return cb(new Error('no instances'));
      if (instances.length < capacity) return cb(new Error('insufficient capacity launched'));
      elb.describeInstanceHealth({
        LoadBalancerName: loadBalancerPublic,
        Instances: instances
      }, cb);
    }]
  }, function (err, results) {
    if (timeout < new Date().getTime())
      return cb(new Error(timeoutMinutes + ' minute timeout for worker health exceeded'));
    if (err) {
      logger.info('issue evaluating worker health', err.message);
      return cb(null, {retry: 10});
    }
    var healthy = true;
    results.health.InstanceStates.forEach(function (instance) {
      if (instance.State !== 'InService') {
        healthy = false;
        logger.info('worker not healthy', instance.InstanceId, instance.State, instance.Description, job.deploy.id);
      }
    });
    if (healthy) cb();
    else cb(null, {retry: 10});
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};