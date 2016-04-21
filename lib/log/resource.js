var db = require('_/db'),
  logSvc = require('./index');

exports.getLogEntries = function (req, res, next) {
  var options = {
    limit: req.pagination.limit,
    createdAfter: req.pagination.updatedAfter || req.pagination.createdAfter,
    createdBefore: req.pagination.updatedBefore || req.pagination.createdBefore,
    query: req.query.query,
    filter: req.query.filter,
    deployId: req.query.deployId,
    workerId: req.query.workerId
  };

  /*
    Query deploy id for instance id
  */

  logSvc.getLogEntries(req.context.app.handle, req.context.stack.handle, req.params.source, options, function (err, events, nextEvent) {
    if (err) return next(err);
    if (nextEvent) res.set('Next', nextEvent);
    return (err) ? next(err) : res.json(events);
  });
};

exports.getLogSources = function (req, res, next) {
  logSvc.getLogSources(function (err, logSources) {
    return (err) ? next(err) : res.json(logSources);
  });
};
