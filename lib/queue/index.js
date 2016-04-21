var async = require('async'),
  amazonSvc = require('_/amazon'),
  logger = require('_/logger')('queue'),
  settings = require('_/settings'),
  error = require('_/error');

exports._interval = null;

exports.enqueue = function (module, method, data, options, cb) {
  logger.debug('Enqueue', 'module', module, 'method', method, 'action', data.action,
              'appId', data.appId, 'stackId', data.stackId);
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var sqs = amazonSvc.service('SQS'),
    delay = options.delay || 0,
    body = {
      module: module,
      method: method,
      data: data
    };
  sqs.sendMessage({
    MessageBody: JSON.stringify(body),
    QueueUrl: settings.sqsQueueUrl,
    DelaySeconds: delay
  }, function (err) {
    if (err) return cb(new error.AmazonError('sqs.sendMessage', err));
    cb();
  });
};

exports.receive = function () {
  var sqs = amazonSvc.service('SQS');
  sqs.receiveMessage({
    QueueUrl: settings.sqsQueueUrl,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 20,
    AttributeNames: ['ApproximateReceiveCount']
  }, function (err, data) {
    clearInterval(exports._interval);
    exports._interval = setInterval(exports.receive, 20000);
    setTimeout(exports.receive, 1);
    if (err) return logger.warn(new error.AmazonError('sqs.receiveMessage', err));
    if (data.Messages && data.Messages.length) handle(data.Messages);
  });
};

function handle(messages) {
  messages.forEach(function (message) {
    var body, module, method, data, handler, extender, finisher;
    try {
      body = JSON.parse(message.Body);
    } catch (err) {
      return logger.warn(new error.ServoError('unable to parse message json'), message);
    }
    module = body.module;
    method = body.method;
    data = body.data;
    logger.debug('Handle', 'messageId', message.MessageId, 'module', module, 'method', method, 'action', data.action,
                'appId', data.appId, 'stackId', data.stackId);
    try {
      require.resolve(module);
    } catch (err) {
      return logger.warn(new error.ServoError('invalid module'));
    }
    handler = require(module)[method];
    if (typeof handler !== 'function')
      return logger.warn(new error.ServoError('invalid method ' + method));
    logger.info('QueueSvc handler', 'module', body.module, 'method', body.method);
    extender = extend.bind({ReceiptHandle: message.ReceiptHandle});
    finisher = finish.bind({
      ReceiptHandle: message.ReceiptHandle,
      ReceiveCount: message.Attributes.ApproximateReceiveCount
    });
    handler(data, finisher, extender);
  });
}

function extend(seconds) {
  var sqs = amazonSvc.service('SQS'),
    ReceiptHandle = this.ReceiptHandle;
  sqs.changeMessageVisibility({
    QueueUrl: settings.sqsQueueUrl,
    ReceiptHandle: ReceiptHandle,
    VisibilityTimeout: seconds
  }, function (err) {
    if (err) return logger.warn(new error.AmazonError('sqs.changeMessageVisibility', err));
    logger.trace('extended message visibility', ReceiptHandle, seconds);
  });
}

function finish(handlerError) {
  var sqs = amazonSvc.service('SQS'),
    receiptHandle = this.ReceiptHandle,
    receiveCount = this.ReceiveCount,
    delay = Math.pow(5, receiveCount);
  if (handlerError && receiveCount < 5) {
    sqs.changeMessageVisibility({
      QueueUrl: settings.sqsQueueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: delay
    }, function (err) {
      if (err) return logger.warn(new error.AmazonError('sqs.changeMessageVisibility', err));
      logger.info(
        'queue message handler yielded error',
        handlerError.message,
        {retryDelay: delay, attempt: receiveCount}
      );
    });
  } else if (handlerError && receiveCount >= 5) {
    logger.warn(
      handlerError,
      {attempt: receiveCount},
      'queue message handler yielded error'
    );
  } else {
    sqs.deleteMessage({
      QueueUrl: settings.sqsQueueUrl,
      ReceiptHandle: receiptHandle
    }, function (err) {
      if (err) return logger.warn(new error.AmazonError('sqs.deleteMessage'), err);
      logger.trace('deleted message', receiptHandle);
    });
  }
}
