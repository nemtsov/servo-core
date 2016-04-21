var event = require('_/event'),
  admin = require('_/admin'),
  db = require('_/db'),
  async = require('async'),
  request = require('request'),
  logger = require('_/logger')('slack'),
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    slack: admin.getSlackInstance.bind(null, notification.destination.team),
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    send: ['slack', 'render', function (cb, results) {
      sendSlack(results.slack, results.render, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('slack send error', err)
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('slack send complete', data)
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendSlack(slack, render, notification, cb) {
  if (!slack[0]) return cb(new Error('no slack configured'));
  var payload = {
    channel: notification.destination.address,
    text: '[' + render.type + '] ' + render.handle + ' ' + render.message
  };

  request({
    url: slack[0].webhookUrl,
    timeout: 10000,
    ignoreCache: true,
    method: 'POST',
    json: payload
  }, function (err, res, data) {
    cb(err, data);
  });
}
