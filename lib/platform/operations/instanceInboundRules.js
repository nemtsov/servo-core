var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var ec2 = amazonSvc.service('EC2'),
    loadBalancerGroup = job.stack.assets.active.loadBalancerSecurityGroup ||
      job.stack.assets.pending.loadBalancerSecurityGroup,
    instanceGroup = job.stack.assets.active.instanceSecurityGroup ||
      job.stack.assets.pending.instanceSecurityGroup;
  if (job.inboundRules) return cb();

  ec2.authorizeSecurityGroupIngress({
    GroupId: instanceGroup,
    IpPermissions: [{
      FromPort: 443,
      ToPort: 444,
      IpProtocol: 'tcp',
      UserIdGroupPairs: [{
        GroupId: loadBalancerGroup,
        UserId: '000127866032' //TODO replace with account id from settings
      }]
    }]
  }, function (err) {
    if (err && err.name === 'InvalidPermission.Duplicate') err = null;
    if (err) return cb(new error.AmazonError('ec2.authorizeSecurityGroupIngress', err));
    job.inboundRules = true;
    cb();
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};