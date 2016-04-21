var logger = require('_/logger')('request');

module.exports = function (req, res, next) {
  if (req.url === '/_health') return next();
  var start = Date.now();
  res.on('finish', function () {
    var duration = Date.now() - start,
      level = (res.statusCode < 500) ? 'info' : 'warn',
      event = {
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        duration: duration
      };
    if (res.error) logger[level](event, req.method + ' ' + req.url, res.error);
    else logger[level](event, req.method + ' ' + req.url);
  });
  next();
};