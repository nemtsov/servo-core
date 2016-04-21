var BaseHandler = require('./BaseHandler'),
  error = require('_/error'),
  logger = require('_/logger')('event'),
  eventSvc = require('_/event'),
  async = require('async'),
  moment = require('moment'),
  inherits = require('util').inherits;

function StatusCheck() {
  BaseHandler.call(this, 'StatusCheck');
}

module.exports = StatusCheck;

inherits(StatusCheck, BaseHandler);

StatusCheck.prototype.match = function (message) {
  var AlarmName = message.Body.Message.AlarmName;
  return (AlarmName && AlarmName.match('statuscheck'));
};

StatusCheck.prototype.consume = function (message, cb) {
  var Message = message.Body.Message,
    options = {timestamp: moment(message.Body.Timestamp).valueOf()},
    asgName,
    eventMessage,
    eventType;
  if (Message && Message.OldStateValue === 'INSUFFICIENT_DATA') return cb(true);
  if (message.Body.TopicArn)
    asgName = message.Body.TopicArn.split(':')[5];

  switch (Message.NewStateValue) {
    case 'OK':
      eventType = 'WorkerStable';
      eventMessage = 'All workers passing status checks';
      break;
    case 'ALARM':
      eventType = 'WorkerIssue';
      eventMessage = 'A worker is failing status checks';
      options.severity = 'warn';
      break;
    default:
      logger.error('Malformed state value ', Message.NewStateValue);
      return cb(false);
  }
  async.auto({
    context: this.contextualizeAsgName.bind(null, asgName),
    publishEvent: ['context', function (cb, results) {
      eventSvc.publish(eventType, eventMessage, results.context, options, cb);
    }]
  }, function (err) {
    if (err) {
      logger.error('statuscheck event handler yields ', err);
      return cb(false);
    }
    cb(true);
  });
};