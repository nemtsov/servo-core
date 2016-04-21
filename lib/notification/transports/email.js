var event = require('_/event'),
  db = require('_/db'),
  async = require('async'),
  amazonSvc = require('_/amazon'),
  logger = require('_/logger')('email'),
  route53Domain = require('_/settings').route53Domain,
  render = require('./renderer');

exports.send = function (notification, cb) {
  async.auto({
    event: event.get.bind(event, notification.eventId),
    render: ['event', function (cb, results) {
      render.renderer(results.event, cb);
    }],
    send: ['render', function (cb, results) {
      sendEmail(results.render, notification, function (err, data) {
        if (err) {
          notification.log = err;
          notification.state = 'FAILED';
          logger.warn('email send error', err)
        } else {
          notification.log = data;
          notification.state = 'COMPLETE';
          logger.info('email send complete', data)
        }
        db.notificationDelivery.updateById(notification.id, notification, cb);
      });
    }]
  }, cb);
};

function sendEmail (render, notification, cb) {
  var ses = amazonSvc.service('SES', 'us-east-1');
  ses.sendEmail({
    Destination: {
      ToAddresses: [notification.destination.address]
    },
    Message: {
      Body: {
        Text: {
          Data: JSON.stringify(render, null, 2)
        }
      },
      Subject: {
        Data: '[' + render.type + '] ' + render.handle
      }
    },
    Source: 'Servo <noreply@' + route53Domain + '>'
  }, function (err, data) {
    if (err) return cb(err);
    cb(null, data);
  });
}
