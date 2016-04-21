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
  elb.modifyLoadBalancerAttributes({
    LoadBalancerAttributes: {
      AccessLog: {
        Enabled: true,
        EmitInterval: 5,
        S3BucketName: settings.s3Bucket,
        S3BucketPrefix: 'logs/loadbalancer/' + name
      },
      ConnectionDraining: {
        Enabled: true,
        Timeout: 15
      },
      CrossZoneLoadBalancing: {
        Enabled: true
      }
    },
    LoadBalancerName: name
  }, function (err) {
    if (err) err = new error.AmazonError('elb.modifyLoadBalancerAttributes', err);
    if (!err) logger.info('configured loadbalancer attributes', name, deployId);
    cb(err);
  });
}