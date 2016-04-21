var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.snsTopicSubscription ||
    job.stack.assets.active.snsTopicSubscription) return cb();
  var sns = amazonSvc.service('SNS'),
    snsTopic = job.stack.assets.pending.snsTopic ||
      job.stack.assets.active.snsTopic;

  sns.subscribe({
    Protocol: 'sqs',
    TopicArn: snsTopic,
    Endpoint: settings.eventsQueueArn
  }, function (err) {
    if (err) return cb(err);
    logger.info('created sns subscription', job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.snsTopicSubscription': settings.eventsQueueArn}, cb
    );
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};
