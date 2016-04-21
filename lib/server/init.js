var express = require('express'),
  app = require('../../server').app = express(),
  errorMiddleware = require('_/error/middleware'),
  logger = require('_/logger')('server/init'),
  loggerMiddleware = require('_/logger/middleware'),
  paginationMiddleWare = require('_/router/pagination'),
  bodyParser = require('body-parser'),
  settings = require('_/settings'),
  server;

module.exports = function (cb) {
  app.disable('x-powered-by');
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Authentication, Origin, X-Requested-With, Content-Type, Accept, Token");
    res.header("Access-Control-Expose-Headers", "Next");
    next();
  });
  if (settings.debug) app.use(loggerMiddleware);
  app.use(bodyParser.json());
  app.use(paginationMiddleWare);
  app.use(require('_/router'));
  app.use('/orgs/:org/', require('_/router'));
  app.use(errorMiddleware);
  if (settings.noListen) return cb();
  server = app.listen(settings.port, function () {
    logger.info('server listening on port ' + settings.port);
    cb();
  });
};
