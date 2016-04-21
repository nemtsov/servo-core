var event = require('_/event'),
  db = require('_/db'),
  async = require('async'),
  request = require('request'),
  logger = require('_/logger')('webhook'),
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    send: ['render', function (cb, results) {
      sendWebHook(results.render, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('webhook send error', err)
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('webhook send complete', data)
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendWebHook (render, notification, cb) {
  request({
    url: notification.destination.address,
    timeout: 10000,
    ignoreCache: true,
    method: 'POST',
    json: render
  }, function (err, res, data) {
    cb(err, data);
  });
}
