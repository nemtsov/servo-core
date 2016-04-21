var state = require('../state'),
  AWS = require('aws-sdk'),
  cloudwatch = new AWS.CloudWatchLogs();

module.exports = CloudWatchLogs;

function CloudWatchLogs() {}