var state = require('../state'),
  AWS = require('aws-sdk'),
  sns = new AWS.SNS();

module.exports = SNS;

function SNS() {}

SNS.prototype.subscribe = function (params, cb) {
  var build = sns.subscribe(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {
    SubscriptionArn: 'testArn'
  });
};

SNS.prototype.createTopic = function (params, cb) {
  var build = sns.createTopic(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {TopicArn: 'arn:aws:foo:' + params.Name});
};

SNS.prototype.deleteTopic = function (params, cb) {
  var build = sns.deleteTopic(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb();
};

SNS.prototype.listSubscriptionsByTopic = function (params, cb) {
  var build = sns.listSubscriptionsByTopic(params).build();
  if (build.response.error) return cb(build.response.error);

  cb(null, {
    Subscriptions:[{
      SubscriptionArn: 'sampleArn',
      Owner: 'Owner',
      Protocol: 'email',
      Endpoint: 'test@test.com',
      TopicArn: params.TopicArn
    }]
  });
}
