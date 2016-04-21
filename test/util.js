var awsState = require('_/mock/aws/state'),
  mongoData = require('_/mock/mongo/data'),
  async = require('async');

exports.setEnvVariables = function () {
  process.env.MOCK_DB = 'true';
  process.env.MOCK_AWS = 'true';
  process.env.DEBUG = 'true';
  process.env.PORT = 3000;
  process.env.MONGO_URI = 'mongodb://localhost/servo2?auto_reconnect=true';
  process.env.NODE_ENV = 'test';
  process.env.KEY = 'test';
  process.env.ROUTE53_DOMAIN = 'example.com';
  process.env.AWS_REGION = 'us-east-1';
  process.env.BASE_HANDLE = 'california:ocp';
  process.env.AWS_ACCOUNT_ID='111111';
  process.env.BUILDERS = 'false';
  process.env.NO_LISTEN = 'true';
};

exports.resetAws = resetAws;
function resetAws (cb) {
  awsState.Messages = [];
  cb();
}

exports.resetDb = resetDb;
function resetDb (cb) {
  async.waterfall([
    mongoData.cleanUp,
    mongoData.init
    ], cb);
}

exports.resetAll = function (cb) {
  async.parallel([resetAws, resetDb], cb);
};
