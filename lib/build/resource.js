var db = require('_/db'),
  buildSvc = require('./index'),
  async = require('async'),
  error = require('_/error');

exports.getAll = function (req, res, next) {
  if (req.pagination.limit > 100) req.pagination.limit = 100;
  db.builds.find({source: req.context.app.source}, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    data.forEach(function (build) {
      delete build.key;
    });
    (err) ? next(err) : res.json(data);
  });
};

exports.getOne = function (req, res) {
  delete req.context.build.key;
  res.json(req.context.build);
};

exports.post = function (req, res, next) {
  if (!req.body.commit) return next(new error.BadInputError('you must specify commit'));
  buildSvc.createBuild(req.context.app, req.body.commit, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.getReport = function (req, res, next) {
  buildSvc.getReport(req.context.build, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.getArtifactLink = function (req, res, next) {
  buildSvc.getArtifactLink(req.context.build, function (err, data) {
    (err) ? next(err) : res.json(data);
  })
};