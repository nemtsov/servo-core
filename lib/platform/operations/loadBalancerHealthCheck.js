var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var internalName = job.stack.assets.pending.loadBalancerInternalName ||
      job.stack.assets.active.loadBalancerInternalName,
    publicName = job.stack.assets.pending.loadBalancerPublicName ||
      job.stack.assets.active.loadBalancerPublicName;
  async.each([internalName, publicName], configure.bind({}, job.deploy.id), cb);
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};

function configure(deployId, name, cb) {
  var elb = amazonSvc.service('ELB');
  elb.configureHealthCheck({
    HealthCheck: {
      HealthyThreshold: 2,
      Interval: 15,
      Target: 'HTTPS:443/_health',
      Timeout: 10,
      UnhealthyThreshold: 2
    },
    LoadBalancerName: name
  }, function (err) {
    logger.info('configured loadbalancer health check', name, deployId);
    if (err) err = new error.AmazonError('elb.configureHealthCheck', err);
    cb(err);
  });
}