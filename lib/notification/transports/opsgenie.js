var event = require('_/event'),
  admin = require('_/admin'),
  db = require('_/db'),
  async = require('async'),
  request = require('request'),
  logger = require('_/logger')('opsgenie'),
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    opsgenie: admin.getOpsgenie.bind(admin),
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    send: ['opsgenie', 'render', function (cb, results) {
      sendOpsgenie(results.opsgenie, results.render, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('opsgenie send error', err);
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('opsgenie send complete', data);
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendOpsgenie (opsgenie, render, notification, cb) {
  if (!Array.isArray(opsgenie) || !opsgenie.length) return cb(new Error('no opsgenie configured'));
  var payload = {
    source: 'Servo Notifications',
    apiKey: opsgenie[0].key,
    message: '[' + render.type + '] ' + render.handle,
    description: render.message,
    details: render,
    teams: [notification.destination.address]
  };
  request({
    url: opsgenie[0].url,
    timeout: 10000,
    ignoreCache: true,
    method: 'POST',
    json: payload
  }, function (err, res, data) {
    cb(err, data);
  });
}
