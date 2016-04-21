var state = require('../state'),
  AWS = require('aws-sdk'),
  elb = new AWS.ELB();

module.exports = ELB;

function ELB() {}

ELB.prototype.createLoadBalancer = function (params, cb) {
  var build = elb.createLoadBalancer(params).build(),
    dnsName = params.LoadBalancerName + '.elb.amazonaws.com';
  if (build.response.error)
    return cb(build.response.error);
  params.DNSName = dnsName;
  state.LoadBalancers.push(params);
  cb(null, {DNSName: dnsName});
};

ELB.prototype.deleteLoadBalancer = function (params, cb) {
  var build = elb.deleteLoadBalancer(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.LoadBalancers = state.LoadBalancers.filter(function (loadbalancer) {
    return (loadbalancer.LoadBalancerName !== params.LoadBalancerName);
  });
  cb();
};

ELB.prototype.configureHealthCheck = function (params, cb) {
  var build = elb.configureHealthCheck(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

ELB.prototype.modifyLoadBalancerAttributes = function (params, cb) {
  var build = elb.modifyLoadBalancerAttributes(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

ELB.prototype.describeInstanceHealth = function (params, cb) {
  var build = elb.describeInstanceHealth(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {
    InstanceStates: [
      {InstanceId: 'i-1234567', State: 'InService'}
    ]
  });
};