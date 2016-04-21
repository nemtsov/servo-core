var state = require('../state'),
  AWS = require('aws-sdk'),
  cloudwatch = new AWS.CloudWatch();

module.exports = CloudWatch;

function CloudWatch() {}

CloudWatch.prototype.putMetricAlarm = function (params, cb) {
  var build = cloudwatch.putMetricAlarm(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

CloudWatch.prototype.deleteAlarms = function (params, cb) {
  var build = cloudwatch.deleteAlarms(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};