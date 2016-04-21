var async = require('async'),
  db = require('_/db'),
  appSvc = require('./index'),
  error = require('_/error'),
  App = require('./model');

exports.getAll = function (req, res, next) {
  db.apps.find({}, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.getOne =  function (req, res) {
  res.json(req.context.app);
};

exports.post = function (req, res, next) {
  var app;
  try {
    app = new App(req.body.name, req.body.source);
  } catch (err) {
    return next(err);
  }
  appSvc.create(app, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.del = function (req, res, next) {
  appSvc.destroy(req.context.app, function (err) {
    (err) ? next(err) : res.status(204).end();
  });
};

exports.put = function (req, res, next) {
  var name = req.body.name;
  if (!name) next(new error.BadInputError('name property must be specified'));
  req.context.app.name = name;
  db.apps.save(req.context.app, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};