var eventSvc = require('_/event'),
  notificationSvc = require('_/notification');

module.exports = function (cb) {
  eventSvc.on('*', notificationSvc.processNotifications);
  cb();
};