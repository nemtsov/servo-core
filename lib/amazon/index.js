var AWS = require('aws-sdk'),
  mockAWS = require('_/mock/aws'),
  settings = require('_/settings');

exports.service = function (serviceName, region) {
  var Service = (settings.mockAws) ? mockAWS[serviceName] : AWS[serviceName];
  region = region || settings.awsRegion;
  AWS.config.update({region: region});
  return new Service();
};