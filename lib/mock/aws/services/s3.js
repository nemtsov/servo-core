var state = require('../state'),
  AWS = require('aws-sdk'),
  s3 = new AWS.S3();

module.exports = S3;

function S3() {}

S3.prototype.listBuckets = function (cb) {
  cb(null, {Buckets: state.Buckets, Owner: {}});
};

S3.prototype.putObject = function (params, cb) {
  var build = s3.putObject(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {SSECustomerKeyMD5: params.SSECustomerKeyMD5});
};

S3.prototype.listObjects = function () {};
S3.prototype.completeMultipartUpload = function () {};
S3.prototype.uploadPart = function () {};
S3.prototype.createMultipartUpload = function () {};
//this needs to be built in order to make the mock call when starting a build
S3.prototype.upload = function (obj, cb) { cb(null)};