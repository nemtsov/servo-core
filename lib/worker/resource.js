var async = require('async'),
  workerSvc = require('./index'),
  db = require('_/db');

exports.getAll = function (req, res, next) {
  var query = {appId: req.context.app.id};
  if (req.context.stack) query.stackId = req.context.stack.id;
  db.workers.find(query, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

exports.getOne = function (req, res, next) {
  var query = {
    id: req.params.workerId,
    appId: req.context.app.id
  };
  if (req.context.stack)
    query.stackId = req.context.stack.id;
  db.workers.findOne(query, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.getWorkerStatus = function (req, res, next) {
  workerSvc.getServerStatus(req.context.app.id, req.context.stack.id, req.params.workerId, function (err, status) {
    (err) ? next(err) : res.json(status);
  })
};
