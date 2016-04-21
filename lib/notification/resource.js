var error = require('_/error'),
  async = require('async'),
  notificationSvc = require('./index.js'),
  NotificationRule = require('./model'),
  db = require('_/db');

exports.getAll = function (req, res, next) {
  var query;

  if (!req.context) {
    query = {};
  } else {
    var scope = determineScope(req);
    query = {scope: scope};
  }

  db.notificationRules.find(query, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.post = function (req, res, next) {
  var notificationRule,
    scope = req.context ? determineScope(req) : '*';

  try {
    notificationRule = new NotificationRule(scope, req.body.type, req.body.destinations);
  } catch (err) {
    return next(err);
  }

  notificationSvc.create(notificationRule, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.put = function (req, res, next) {
  var scope = req.context ? determineScope(req) : '*',
    id = req.params.notificationId,
    notificationRule;

  try {
    notificationRule = new NotificationRule(scope, req.body.type, req.body.destinations);
  } catch (err) {
    return next(err);
  }

  async.auto({
    current: db.notificationRules.findById.bind(db.notificationRules, id),
    update: ['current' , function (cb, results) {
      if (!results.current) return cb(new error.NotFoundError('Notification Rule not found'));
      db.notificationRules.updateById(req.params.notificationId, notificationRule, cb);
    }],
    notificationRule: ['update', db.notificationRules.findById.bind(db.notificationRules, id)]
  }, function (err, results) {
    (err) ? next(err) : res.send(results.notificationRule);
  });
};

exports.del = function (req, res, next) {
  async.auto({
    notificationRule: db.notificationRules.findById.bind(db.notificationRules, req.params.notificationId),
    remove: ['notificationRule', function (cb, results) {
      if (!results.notificationRule) return cb(new error.NotFoundError('Notification Rule not found'));
      notificationSvc.destroy(results.notificationRule, cb);
    }]
  }, function (err) {
    (err) ? next(err) : res.status(204).end();
  });
};

function determineScope(req) {
  if (req.context.stack) return {'stackId': req.context.stack.id};
  if (req.context.app) return {'appId': req.context.app.id};
}