var state = require('../state'),
  AWS = require('aws-sdk'),
  route53 = new AWS.Route53();

module.exports = Route53;

function Route53() {}

Route53.prototype.listHostedZones = function (params, cb) {
  var build = route53.listHostedZones(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {HostedZones: state.HostedZones});
};

Route53.prototype.changeResourceRecordSets = function (params, cb) {
  var build = route53.changeResourceRecordSets(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

Route53.prototype.listResourceRecordSets = function () {};
