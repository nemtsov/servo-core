var event = require('_/event'),
  admin = require('_/admin'),
  db = require('_/db'),
  async = require('async'),
  request = require('request'),
  logger = require('_/logger')('sms'),
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    twilio: admin.getTwilio.bind(admin),
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    send: ['twilio', 'render', function (cb, results) {
      sendSms(results.twilio, results.render, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('sms send error', err);
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('sms send complete', data);
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendSms (twilio, render, notification, cb) {
  if (!Array.isArray(twilio) || !twilio.length) return cb(new Error('no twilio configured'));
  var payload = {
    To: notification.destination.address,
    From: twilio[0].phone,
    Body: render.type + "\n" + render.handle + "\n" + render.message
  };
  request({
    url: 'https://api.twilio.com/2010-04-01/Accounts/' + twilio[0].accountSid + '/Messages.json',
    auth: {
      user: twilio[0].accountSid,
      pass: twilio[0].token
    },
    timeout: 10000,
    ignoreCache: true,
    method: 'POST',
    form: payload
  }, function (err, res, data) {
    cb(err, data);
  });
}
