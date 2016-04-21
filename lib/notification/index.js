var db = require('_/db'),
  eventSvc = require('_/event'),
  logger = require('_/logger')('notification'),
  async = require('async'),
  queueSvc = require('_/queue');

exports.processNotifications = function (event, cb) {
  async.auto({
    matchingRules: getMatchingRules.bind({}, event),
    saveNotifications: ['matchingRules', function (cb, results) {
      var notifications = [];
      results.matchingRules.forEach(function (rule) {
        rule.destinations.forEach(function (destination) {
          notifications.push({
            eventId: event.id,
            notificationRuleId: rule.id,
            destination: destination,
            state: 'PENDING',
            log: []
          });
        });
      });
      if (notifications)
        logger.info('pending notifications', JSON.stringify(notifications));
      async.each(notifications, function (notification, cb) {
        async.auto({
          save: db.notificationDelivery.save.bind(db.notificationDelivery, notification),
          enqueue: ['save', function (cb, results) {
            queueSvc.enqueue('_/notification', 'sendNotification', results.save, cb);
            logger.info('notification enqueued', JSON.stringify(results.save));
          }]
        }, cb);
      }, cb);
    }]
  }, cb);
};

exports.sendNotification = function (notification, cb) {
  try {
    var transport = require('_/notification/transports/' + notification.destination.transport);
    transport.send(notification, cb);
  } catch (err) {
    logger.error('Failed to send notification', err);
    cb(err);
  }
};

exports.create = function (notificationRule, cb) {
  async.auto({
    index: db.notificationRules.ensureIndex.bind(db.notificationRules, {type: 1, scope: 1}),
    save: ['index', db.notificationRules.save.bind(db.notificationRules, notificationRule)],
    event: ['save', function (cb) {
      cb(); //TODO make real event
    }]
  }, function (err, results) {
    cb(err, (!err) ? results.save : null);
  });
};

exports.destroy = function (notificationRule, cb) {
  async.auto({
    destroy: [db.notificationRules.destroyById.bind(db.notificationRules, notificationRule.id)],
    event: ['destroy', function (cb) {
      cb(); //TODO make real event
    }]
  }, cb);
};

function getMatchingRules(event, cb) {
  var query = [
    {$or: [{type: event.type}, {type: "*"}]},
  ];

  if (event.context.stackId) {
    query.push({$or: [{scope: {stackId: event.context.stackId}}, {scope: "*"}]});
  } else if (event.context.appId) {
    query.push({$or: [{scope: {appId: event.context.appId}}, {scope: "*"}]});
  }

  db.notificationRules.find({$and: query}, cb);
}
