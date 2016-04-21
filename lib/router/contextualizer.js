var db = require('_/db'),
  async = require('async'),
  error = require('_/error');

function setContext (item, query, req, next) {
  var collection = item + 's';
  db[collection].findOne(query, function (err, doc) {
    if (doc) {
      req.context[item] = doc;
      return next();
    }

    if (!(err instanceof error.NotFoundError) || query.id) return next(err);
    query.id = query.handle;
    delete query.handle;
    setContext(item, query, req, next);
  });
}

function initializeQuery (target, req) {
  var handle = req.params[target + 'Handle'],
    id = req.params[target + 'Id'];
  return handle ? {handle: handle} : {id: id};
}

exports.app = function (req, res, next) {
  if (!req.context) req.context = {};
  var query = initializeQuery('app', req);
  setContext('app', query, req, next);
};

exports.stack = function (req, res, next) {
  if (!req.context) return next(new error.BadInputError('Route can not be contextualized'));
  var query = initializeQuery('stack', req);
  query.appId = req.context.app.id;
  setContext('stack', query, req, next);
};

exports.deploy = function (req, res, next) {
  if (!req.context) return next(new error.BadInputError('Route can not be contextualized'));
  var query = initializeQuery('deploy', req);
  query.appId = req.context.app.id;
  query.stackId = req.context.stack.id;
  setContext('deploy', query, req, next);
};

exports.build = function (req, res, next) {
  if (!req.context) return next(new error.BadInputError('Route can not be contextualized'));
  var query = initializeQuery('build', req);
  query.source = req.context.app.source;
  setContext('build', query, req, next);
};

module.exports = exports;