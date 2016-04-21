var async = require('async'),
  db = require('_/db'),
  stackSvc = require('./index'),
  Stack = require('./model');

exports.getAll = function (req, res, next) {
  db.stacks.find({appId: req.context.app.id}, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.getOne = function (req, res) {
  res.json(req.context.stack);
};

exports.post = function (req, res, next) {
  var stack;
  try {
    stack = new Stack(req.body.name, req.context.app.id);
  } catch (err) {
    return next(err);
  }
  stackSvc.create(stack, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.del = function (req, res, next) {
  stackSvc.destroy(req.context.stack, function (err) {
    (err) ? next(err) : res.status(204).end();
  });
};