var state = require('../state'),
  AWS = require('aws-sdk'),
  cloudwatch = new AWS.Lambda();

module.exports = Lambda;

function Lambda() {}