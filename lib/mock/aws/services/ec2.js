var state = require('../state'),
  AWS = require('aws-sdk'),
  ec2 = new AWS.EC2(),
  crypto = require('crypto');

module.exports = EC2;

function EC2() {}

EC2.prototype.describeVpcs = function (params, cb) {
  var build = ec2.describeVpcs(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {Vpcs: state.Vpcs});
};

EC2.prototype.createSecurityGroup = function (params, cb) {
  var build = ec2.createSecurityGroup(params).build(),
    dupError = new Error('security group name exists'),
    vpcMatch, securityGroupMatch, groupId;
  if (build.response.error)
    return cb(build.response.error);
  vpcMatch = state.Vpcs.filter(function (vpc) {
    return (vpc.VpcId === params.VpcId);
  });
  if (!vpcMatch.length) return cb(new Error('vpc not found'));
  securityGroupMatch = state.SecurityGroups.filter(function (group) {
    return (group.GroupName === params.GroupName);
  });
  dupError.name = 'InvalidGroup.Duplicate';
  if (securityGroupMatch.length) return cb(dupError);
  groupId = 'sg-' + crypto.randomBytes(4).toString('hex');
  state.SecurityGroups.push({
    GroupId: groupId,
    GroupName: params.GroupName,
    Description: params.Description,
    VpcId: params.VpcId
  });
  cb(null, {GroupId: groupId});
};

EC2.prototype.deleteSecurityGroup = function (params, cb) {
  var build = ec2.deleteSecurityGroup(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.SecurityGroups = state.SecurityGroups.filter(function (group) {
    return (group.GroupId !== params.GroupId);
  });
  cb(null);
};

EC2.prototype.describeSubnets = function (params, cb) {
  var build = ec2.describeSubnets(params).build(),
    match;
  if (build.response.error)
    return cb(build.response.error);
  match = state.Subnets.filter(function (subnet) {
    return (subnet.Tags[0].Value === params.Filters[0].Values[0]);
  });
  cb(null, {Subnets: match});
};

EC2.prototype.describeImages = function (params, cb) {
  var build = ec2.describeSubnets(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {Images: [{ImageId: 'ami-1234567'}]});
};

EC2.prototype.describeSecurityGroups = function(params, cb) {
  var build = ec2.describeSecurityGroups(params).build(),
    match;
  if (build.response.error)
    return cb(build.response.error);

  if (params.Filters) { //For Init
    return cb(null, {SecurityGroups: [{GroupId: 'sg-1234567', IpPermissions: []}]});
  }
  match = state.SecurityGroups.filter(function (securityGroup) {
    return (securityGroup.GroupId === params.GroupIds[0]);
  });
  cb(null, {SecurityGroups: match});
}
EC2.prototype.authorizeSecurityGroupIngress = function (params, cb) {
  var build = ec2.authorizeSecurityGroupIngress(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, params);
};

EC2.prototype.revokeSecurityGroupIngress = function (params, cb) {
  var build = ec2.revokeSecurityGroupIngress(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, params);
};

EC2.prototype.authorizeSecurityGroupEgress = function (params, cb) {
  var build = ec2.authorizeSecurityGroupEgress(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

EC2.prototype.revokeSecurityGroupEgress = function (params, cb) {
  var build = ec2.revokeSecurityGroupEgress(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

EC2.prototype.describeSpotPriceHistory = function (params, cb) {
  var build = ec2.describeSpotPriceHistory(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {SpotPriceHistory: [{InstanceType: 'm3.medium', SpotPrice: 0.01}]});
};

EC2.prototype.terminateInstances = function () {};
EC2.prototype.modifyInstanceAttribute = function () {};
EC2.prototype.createImage = function () {};
EC2.prototype.runInstances = function () {};
