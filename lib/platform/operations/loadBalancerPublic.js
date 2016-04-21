var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations/loadBalancerPublic');

exports.setup = function (job, cb) {
  if (job.stack.assets.active.loadBalancerPublicName ||
    job.stack.assets.pending.loadBalancerPublicName) return cb();
  var elb = amazonSvc.service('ELB'),
    securityGroup = job.stack.assets.active.loadBalancerSecurityGroup ||
      job.stack.assets.pending.loadBalancerSecurityGroup,
    orgHandle = settings.baseHandle.split(':')[0],
    loadBalancerName = orgHandle + '-' + job.stack.id + '-pub',
    sslCertificate = null,
    params;
  job.deploy.config.forEach(function (config) {
    if (config.key === 'PublicCertificate') sslCertificate = config.value;
  });
  params = {
    Listeners: [
      {
        InstancePort: (sslCertificate) ? 444 : 443,
        LoadBalancerPort: 80,
        Protocol: 'HTTP',
        InstanceProtocol: 'HTTPS'
      }
    ],
    LoadBalancerName: loadBalancerName,
    SecurityGroups: [securityGroup],
    Subnets: [
      settings.sharedSubnets[0],
      settings.sharedSubnets[1]
    ]
  };
  if (sslCertificate) {
    params.Listeners.push({
      InstancePort: 443,
      LoadBalancerPort: 443,
      Protocol: 'HTTPS',
      InstanceProtocol: 'HTTPS',
      SSLCertificateId: 'arn:aws:iam::' + settings.awsAccountId + ':server-certificate/' +
      settings.baseHandle + ':' + sslCertificate
    });
  }
  elb.createLoadBalancer(params, function (err, data) {
    if (err) return cb(new error.AmazonError('elb.createLoadBalancer', err));
    logger.info('created public loadbalancer', loadBalancerName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {
        'assets.pending.loadBalancerPublicName': loadBalancerName,
        'assets.pending.loadBalancerPublicDns': data.DNSName
      }, cb
    );
  });
};

exports.revert = function (job, cb) {
  var elb = amazonSvc.service('ELB'),
    loadBalancerName = job.stack.assets.pending.loadBalancerPublicName;
  if (!loadBalancerName) return cb();
  elb.deleteLoadBalancer({
    LoadBalancerName: loadBalancerName
  }, function (err) {
    if (err) return cb(new error.AmazonError('elb.deleteLoadBalancer', err));
    logger.info('deleted public loadbalancer', loadBalancerName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {
        'assets.pending.loadBalancerPublicName': null,
        'assets.pending.loadBalancerPublicDns': null
      }, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var elb = amazonSvc.service('ELB'),
    loadBalancerName = job.stack.assets.active.loadBalancerPublicName;
  if (!loadBalancerName) return cb();
  elb.deleteLoadBalancer({
    LoadBalancerName: loadBalancerName
  }, function (err) {
    if (err) return cb(new error.AmazonError('elb.deleteLoadBalancer', err));
    logger.info('deleted public loadbalancer', loadBalancerName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {
        'assets.active.loadBalancerPublicName': null,
        'assets.active.loadBalancerPublicDns': null
      }, cb
    );
  });
};
