var db = require('_/db'),
  deploySvc = require('./index'),
  error = require('_/error'),
  async = require('async');

exports.getAll = function (req, res, next) {
  var query = {appId: req.context.app.id, stackId: req.context.stack.id};
  db.deploys.find(query, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.getOne = function (req, res) {
  res.json(req.context.deploy);
};

exports.getLatest = function (req, res, next) {
  var query = {appId: req.context.app.id, stackId: req.context.stack.id};
  db.deploys.find(query, {limit: 1}, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.post = function (req, res, next) {
  var commit = req.body.commit,
    buildId = req.body.buildId;
  if (!commit && !buildId)
    return next(new error.BadInputError('must provide commit or buildId'));
  if (commit && buildId)
    return next(new error.BadInputError('must provide only commit or buildId'));
  async.auto({
    build: (commit) ?
      db.builds.findOne.bind(db.builds, {'commit.sha': commit}) : //TODO limit to app git source
      db.builds.findById.bind(db.builds, buildId),
    checkState: ['build', function (cb, results) {
      if (results.build.state === 'COMPLETE') return cb();
      cb(new error.BadInputError('build not complete'));
    }],
    start: ['build', 'checkState', function (cb, results) {
      var options = {
        description: req.body.description || ''
      };
      deploySvc.start(req.context.app.id, req.context.stack.id, results.build.id, options, cb);
    }]
  }, function (err, results) {
    (err) ? next(err) : res.status(202).json(results.start);
  });
};