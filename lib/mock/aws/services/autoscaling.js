var state = require('../state'),
  AWS = require('aws-sdk'),
  autoscaling = new AWS.AutoScaling();

module.exports = AutoScaling;

function AutoScaling() {}

AutoScaling.prototype.createLaunchConfiguration = function (params, cb) {
  var build = autoscaling.createLaunchConfiguration(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.deleteLaunchConfiguration = function (params, cb) {
  var build = autoscaling.deleteLaunchConfiguration(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.createAutoScalingGroup = function (params, cb) {
  var build = autoscaling.createAutoScalingGroup(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.deleteAutoScalingGroup = function (params, cb) {
  var build = autoscaling.deleteAutoScalingGroup(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.putScalingPolicy = function (params, cb) {
  var build = autoscaling.putScalingPolicy(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {PolicyARN: 'arn:fake:' + params.PolicyName});
};

AutoScaling.prototype.enableMetricsCollection = function (params, cb) {
  var build = autoscaling.enableMetricsCollection(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.putNotificationConfiguration = function (params, cb) {
  var build = autoscaling.putNotificationConfiguration(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

AutoScaling.prototype.describeAutoScalingGroups = function (params, cb) {
  var build = autoscaling.describeAutoScalingGroups(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {AutoScalingGroups: [
    {
      DesiredCapacity: 1,
      Instances: [{InstanceId: 'i-1234567'}]
    }
  ]});
};

AutoScaling.prototype.describeLaunchConfigurations = function (params, cb) {
  var build = autoscaling.describeLaunchConfigurations(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {LaunchConfigurations: [{}]});
};

AutoScaling.prototype.updateAutoScalingGroup = function (params, cb) {
  var build = autoscaling.updateAutoScalingGroup(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};