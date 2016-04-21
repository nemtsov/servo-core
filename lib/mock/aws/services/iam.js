var state = require('../state'),
  AWS = require('aws-sdk'),
  iam = new AWS.IAM();

module.exports = IAM;

function IAM() {}

IAM.prototype.createRole = function (params, cb) {
  var build = iam.createRole(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.putRolePolicy = function (params, cb) {
  var build = iam.putRolePolicy(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.deleteRole = function (params, cb) {
  var build = iam.deleteRole(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.deleteRolePolicy = function (params, cb) {
  var build = iam.deleteRolePolicy(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.createInstanceProfile = function (params, cb) {
  var build = iam.createInstanceProfile(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.addRoleToInstanceProfile = function (params, cb) {
  var build = iam.addRoleToInstanceProfile(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.removeRoleFromInstanceProfile = function (params, cb) {
  var build = iam.removeRoleFromInstanceProfile(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.deleteInstanceProfile = function (params, cb) {
  var build = iam.deleteInstanceProfile(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

IAM.prototype.getRole = function (params, cb) {
  var build = iam.getRole(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};