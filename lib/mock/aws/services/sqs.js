var state = require('../state'),
  AWS = require('aws-sdk'),
  sqs = new AWS.SQS();

module.exports = SQS;

function SQS() {}

SQS.prototype.getQueueUrl = function (params, cb) {
  var match,
    build = sqs.getQueueUrl(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.Queues.forEach(function (queue) {
    if (params.QueueName === queue.QueueName) match = queue.QueueUrl;
  });
  cb((!match) ? new Error('queue not found') : null, {QueueUrl: match});
};

SQS.prototype.receiveMessage = function (params, cb) {
  var messages = [],
    defaultVisibilityTimeout = 30 * 1000,
    maxReceiveCount = 5,
    now = new Date().getTime(),
    build = sqs.receiveMessage(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.Messages.forEach(function (message) {
    if (messages.length >= params.MaxNumberOfMessages) return;
    if (message._deleted) return;
    if (message.Attributes.ApproximateReceiveCount >= maxReceiveCount) return;
    if (message._hiddenUntil > now) return;
    if (message.QueueUrl !== params.QueueUrl) return;
    message._hiddenUntil = now + defaultVisibilityTimeout;
    message.ReceiptHandle = (Math.random() + 1).toString(36).substring(7);
    message.Attributes.ApproximateReceiveCount++;
    messages.push(message);
  });
  cb(null, {Messages: messages});
};

SQS.prototype.sendMessage = function (params, cb) {
  var message = {},
    delay = params.DelaySeconds || 0,
    delayMilliseconds = delay * 1000,
    build = sqs.sendMessage(params).build();
  if (build.response.error)
    return cb(build.response.error);
  message.Body = params.MessageBody;
  message.QueueUrl = params.QueueUrl;
  message.MessageId = (Math.random() + 1).toString(36).substring(7);
  message._hiddenUntil = new Date().getTime() + delayMilliseconds;
  message.Attributes = {
    ApproximateReceiveCount: 0
  };
  state.Messages.push(message);
  cb();
};

SQS.prototype.changeMessageVisibility = function (params, cb) {
  var delayIncrease = params.VisibilityTimeout * 1000,
    build = sqs.changeMessageVisibility(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.Messages.forEach(function (message) {
    if (message.ReceiptHandle === params.ReceiptHandle)
      message._hiddenUntil = new Date().getTime() + delayIncrease;
  });
  cb();
};

SQS.prototype.deleteMessage = function (params, cb) {
  var build = sqs.deleteMessage(params).build();
  if (build.response.error)
    return cb(build.response.error);
  state.Messages.forEach(function (message) {
    if (message.ReceiptHandle === params.ReceiptHandle)
      message._deleted = true;
  });
  cb();
};

SQS.prototype.getQueueAttributes = function (params, cb) {
  var build = sqs.getQueueAttributes(params).build();
  if (build.response.error)
    return cb(build.response.error);
  cb(null, {Attributes: {}});
};
