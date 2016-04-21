var BaseHandler = require('./BaseHandler'),
  error = require('_/error'),
  logger = require('_/logger')('event'),
  eventSvc = require('_/event'),
  async = require('async'),
  moment = require('moment'),
  inherits = require('util').inherits;

function HealthCheck() {
  BaseHandler.call(this, 'HealthCheck');
}

module.exports = HealthCheck;

inherits(HealthCheck, BaseHandler);

HealthCheck.prototype.match = function (message) {
  var AlarmName = message.Body.Message.AlarmName;
  return (AlarmName && AlarmName.match('healthyhost'));
};

HealthCheck.prototype.consume = function (message, cb) {
  var Message = message.Body.Message,
    options = {timestamp: moment(message.Body.Timestamp).valueOf()},
    asgName,
    healthyHostNumber,
    eventType,
    eventMessage;

  if (message.Body.TopicArn)
    asgName = message.Body.TopicArn.split(':')[5];

  if (Message.NewStateReason)
    healthyHostNumber = Message.NewStateReason.match(/datapoint \(([0-9]+\.[0-9]+)\)/);

  if (healthyHostNumber)
    healthyHostNumber = parseFloat(healthyHostNumber[1]);

  if (isNaN(healthyHostNumber)) {
    logger.error(new error.ServoError('Can not parse healthy host number from ' + Message.NewStateReason));
    return cb(false);
  }

  switch (Message.NewStateValue) {
    case 'OK':
      eventType = 'HealthCheckSuccess';
      eventMessage = 'All workers passing health checks';
      break;
    case 'ALARM':
      eventType = (healthyHostNumber >= 1) ? 'HealthCheckPartial' : 'HealthCheckFailure';
      eventMessage = (healthyHostNumber >= 1) ?
        'Some workers failing health checks' : 'All workers failing health checks';
      options.severity = (healthyHostNumber >= 1) ? 'error' : 'fatal';
      break;
    default:
      logger.error('HealthCheck event handler yields ',
        new error.AmazonError('Malformed state value ', Message.NewStateValue));
      return cb(false);
  }

  async.auto({
    context: this.contextualizeAsgName.bind(null, asgName),
    publishEvent: ['context', function (cb, results) {
      eventSvc.publish(eventType, eventMessage, results.context, options, cb);
    }]
  }, function (err) {
    if (err) {
      logger.error('HealthCheckSuccess event handler yields ', err);
      return cb(false);
    }
    cb(true);
  });
};