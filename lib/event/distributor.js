var amazonSvc = require('_/amazon'),
  queueSvc = amazonSvc.service('SQS'),
  logger = require('_/logger')('event'),
  error = require('_/error'),
  async = require('async'),
  settings = require('_/settings'),
  handlers = require('./handlers');

function Distributor (queueURL, interval) {
  this._queueURL = queueURL;
  this._interval = interval;
}

module.exports = function (cb) {
  var queueCheckInterval = 10000;
  return new Distributor(settings.eventsQueueUrl, queueCheckInterval).init(cb);
};

Distributor.prototype.init = function (cb) {
  var interval = this._interval,
    self = this;
  setInterval(function () {
    self.process();
  }, interval);
  if (cb) cb();
};

Distributor.prototype.process = function () {
  var self = this;
  async.auto({
    messages: self.getMessages.bind(self),
    handledMessages: ['messages', function (cb, results) {
      self.distribute(results.messages, cb);
    }],
    deleteMessages: ['handledMessages', function (cb, results) {
      if (!results.handledMessages.length) return cb();
      queueSvc.deleteMessageBatch({
        Entries: results.handledMessages,
        QueueUrl: self._queueURL
      }, cb);
    }]
  }, function (err) {
    if (err) return logger.error('Event distribtion failed', err);
  });
};

Distributor.prototype.getMessages = function (cb) {
  queueSvc.receiveMessage({
    QueueUrl: this._queueURL,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 5
  }, function (err, data) {
    if (err) return cb(err);
    var messages = data.Messages;
    if (!messages) messages = [];
    cb(null, messages);
  });
};

Distributor.prototype.handle = function (message, cb) {
  var types = Object.keys(handlers);
  try {
    message.Body = JSON.parse(message.Body);
    message.Body.Message = JSON.parse(message.Body.Message);
  } catch (err) {
    //TODO: Log Error
    if (err) {
      console.error(err);
      return cb(false);
    }
  }
  async.reduce(types, null, function (cached, type, cb) {
    var handler = new handlers[type]();
    handler.handle(message, function (err, matched) {
      if (err) return cb(err);
      if (cached && matched) return cb(new error.ConflictError('Message: ' + message + 'matched multiple handlers'));
      cb(null, matched);
    });
  }, cb);
};

Distributor.prototype.distribute = function (messages, cb) {
  var self = this;
  async.filter(messages, function (message, cb) {
    self.handle(message, cb);
  }, function (handledMessages) {
    async.map(handledMessages, function (handledMessage, cb) {
      cb(null, {
        Id: handledMessage.MessageId,
        ReceiptHandle: handledMessage.ReceiptHandle
      });
    }, cb);
  });
};