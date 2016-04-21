var event = require('_/event'),
  admin = require('_/admin'),
  db = require('_/db'),
  async = require('async'),
  request = require('request'),
  logger = require('_/logger')('voice'),
  amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    twilio: admin.getTwilio,
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    s3: ['event', 'render', function (cb, results) {
      var s3 = amazonSvc.service('S3'),
        message = 'This is a Servo notification. ' + results.render.type +
                  ' for ' + results.render.handle + ' ' + results.render.message,
        xml = '<?xml version="1.0" encoding="UTF-8"?>' + '\n' + '<Response>' +
              '\n' + '<Say voice="alice">' + message + '</Say>' + '\n' + '<Hangup/>' + '\n' + '</Response>',
        timestamp = new Date().getTime().toString(),
        filename = notification.id + timestamp + '.xml',
        params = {
          Bucket: settings.s3Bucket,
          Key: 'notifications/twilio/' + filename,
          Body: xml,
          ACL: 'public-read',
          ContentType: 'text/xml'
        };
      s3.upload(params, function (err, data) {
        if (err)
          logger.info('s3 upload error', err, data);
        cb(err, data);
      });
    }],
    send: ['twilio', 'render', 's3', function (cb, results) {
      sendVoice(results.s3, results.twilio, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('voice send error', err);
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('voice send complete', data);
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendVoice (s3, twilio, notification, cb) {
  if (!Array.isArray(twilio) || !twilio.length) return cb(new Error('no twilio configured'));

  var payload = {
    To: notification.destination.address,
    From: twilio[0].phone,
    Url: s3.Location,
    Method: 'GET'
  };

  request({
    url: 'https://api.twilio.com/2010-04-01/Accounts/' + twilio[0].accountSid + '/Calls',
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
