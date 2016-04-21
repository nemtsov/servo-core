var queueSvc = require('./index'),
  settings = require('_/settings');

module.exports = function (cb) {
  queueSvc.receive();
  queueSvc._interval = setInterval(queueSvc.receive, 20000);
  cb();
};