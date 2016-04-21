var distributionSvc = require('./index'),
  error = require('_/error'),
  Distribution = require('./models/distribution'),
  Origin = require('./models/origin');

exports.listDistributions = function (req, res, next) {
  distributionSvc.getDistributions(function (err, distributions) {
    (err) ? next(err) : res.json(distributions);
  })
};

exports.postDistribution = function (req, res, next) {
  var distribution;
  try {
    distribution = new Distribution(req.body.id);
  } catch (err) {
    return next(err);
  }
  distributionSvc.createDistribution(distribution, function (err) {
    (err) ? next(err) : res.json(distribution);
  })
};

exports.deleteDistribution = function (req, res, next) {
  distributionSvc.deleteDistribution(req.params.distribution, function (err, data) {
    (err) ? next(err) : res.status(204).end();
  });
};

exports.postOrigin = function (req, res, next) {
  var origin;
  try {
    origin = new Origin(req.body, req.params.distribution);
  } catch (err) {
    return next(err);
  }
  distributionSvc.createOrigin(origin, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};

exports.listOrigins = function (req, res, next) {
  var distributionId = req.params.distribution;
  distributionSvc.listOrigins(distributionId, function (err, data) {
    (err) ? next(err) : res.json(data);
  })
};

exports.deleteOrigin = function (req, res, next) {
  distributionSvc.deleteOrigin(req.params.distribution, req.params.origin, function (err, data) {
    (err) ? next(err) : res.status(204).end();
  });
};

exports.updateOrigin = function (req, res, next) {
  var distributionId = req.params.distribution,
    originId = req.params.origin,
    weight = req.body.weight,
    suspended = req.body.suspended;
  if (weight === undefined && suspended === undefined)
    return next(new error.BadInputError('only weight or suspended can be updated'));
  distributionSvc.updateOrigin(distributionId, originId, weight, suspended, function (err, data) {
    (err) ? next(err) : res.json(data);
  });
};
