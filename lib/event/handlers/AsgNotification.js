var BaseHandler = require('./BaseHandler'),
  logger = require('_/logger')('event'),
  eventSvc = require('_/event'),
  async = require('async'),
  moment = require('moment'),
  inherits = require('util').inherits;

function AsgNotification() {
  BaseHandler.call(this, 'AsgNotification');
}

module.exports = AsgNotification;

inherits(AsgNotification, BaseHandler);

AsgNotification.prototype.match = function (message) {
  var Message = message.Body.Message;
  return (Message.Service && Message.Service.match('AWS Auto Scaling'));
};

AsgNotification.prototype.consume = function (message, cb) {
  var Message = message.Body.Message,
    parsedMessage = [],
    instanceId, eventMessage, tokens, options, eventType;

  if (Message.Event === 'autoscaling:TEST_NOTIFICATION') return cb();

  if (Message.Description) {
    parsedMessage = Message.Description.match(/i-[a-z0-9]*/);
    if (parsedMessage)
      instanceId = parsedMessage[0];
    else
      logger.info(Message.Description);
  }

  if (!instanceId) {
    logger.error('Can not get instanceId from message', Message.Description);
    return cb(false);
  }

  eventMessage = 'Worker {{worker}}';

  if (!Message.Event.match(/autoscaling:EC2_INSTANCE/)) {
    logger.error('Not a ec2 instance asg notification', Message.Event);
    return cb(false);
  }

  tokens = Message.Event.split('_');
  options = {timestamp: moment(message.Body.Timestamp).valueOf()};

  switch (tokens[2]) {
    case 'LAUNCH':
      eventType = 'WorkerCreated';
      break;
    case 'TERMINATE':
      eventType = 'WorkerDestroyed';
      break;
    default:
      logger.error('Unknown asg notification ', Message.Event);
      return cb(false);
  }

  switch (eventType) {
    case 'WorkerCreated':
      if (tokens[3] && tokens[3].match('Error')) {
        eventType = 'WorkerFailure';
        eventMessage = eventMessage + ' failed to create';
        options.severity = 'warn';
      } else {
        eventMessage = eventMessage + ' created';
      }
      break;
    case 'WorkerDestroyed':
      if (tokens[3] && tokens[3].match('Error')) {
        eventType = 'WorkerFailure';
        eventMessage = eventMessage + ' failed to destroy';
        options.severity = 'warn';
      } else {
        eventMessage = eventMessage + ' destroyed';
      }
      break;
  }

  async.auto({
    context: this.contextualizeAsgName.bind(null, Message.AutoScalingGroupName),
    publishEvent: ['context', function (cb, results) {
      results.context.workerId = instanceId;
      eventSvc.publish(eventType, eventMessage, results.context, options, cb);
    }]
  }, function (err, result) {
    if (err) {
      logger.error('WorkerFailure event handler yields ', err);
      return cb(false);
    }
    cb(true);
  });
};
