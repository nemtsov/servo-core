var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.snsTopic ||
    job.stack.assets.active.snsTopic) return cb();
  var sns = amazonSvc.service('SNS'),
    topicName = settings.baseHandle.replace(/:/g, '_') + '_' +
      job.app.handle + '_' + job.stack.handle;

  sns.createTopic({
    Name: topicName
  }, function (err, data) {
    if (err) return cb(new error.AmazonError('sns.createTopic', err));
    logger.info('created sns topic', data.TopicArn, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.snsTopic': data.TopicArn}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var snsTopic = job.stack.assets.pending.snsTopic,
    sns = amazonSvc.service('SNS');
  if (!snsTopic) return cb();
  sns.deleteTopic({
    TopicArn: snsTopic
  }, function (err) {
    if (err) return cb(new error.AmazonError('sns.createTopic', err));
    logger.info('deleted sns topic', snsTopic, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.snsTopic': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  var snsTopic = job.stack.assets.active.snsTopic,
    sns = amazonSvc.service('SNS');
  if (!snsTopic) return cb();
  sns.deleteTopic({
    TopicArn: snsTopic
  }, function (err) {
    if (err) return cb(new error.AmazonError('sns.createTopic', err));
    logger.info('deleted sns topic', snsTopic, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.snsTopic': null}, cb
    );
  });
};