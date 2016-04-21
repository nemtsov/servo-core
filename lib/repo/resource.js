var async = require('async'),
  gitSvc = require('_/git');

exports.getBranches = function (req, res, next) {
  gitSvc.getAllBranches(req.context.app.source, function (err, branches) {
    (err) ? next(err) : res.json(branches);
  });
};

exports.getTags = function (req, res, next) {
  gitSvc.getAllTags(req.context.app.source, function (err, tags) {
    (err) ? next(err) : res.json(tags);
  });
};

exports.getCommits = function (req, res, next) {
  var start = req.query.commit || req.query.branch || req.query.tag || null,
    options = {start: start};
  if (req.pagination.limit > 50) req.pagination.limit = 50;
  if (req.pagination.createdBefore) options.before = req.pagination.createdBefore;
  if (req.pagination.updatedBefore) options.before = req.pagination.updatedBefore;
  if (req.pagination.createdAfter) options.after = req.pagination.createdAfter;
  if (req.pagination.updatedAfter) options.after = req.pagination.updatedAfter;
  options.limit = req.pagination.limit + 1;
  gitSvc.getCommits(req.context.app.source, options, function (err, data) {
    if (data && data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};