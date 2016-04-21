module.exports = function (req, res, next) {
  req.pagination = {
    limit: parseInt(req.query.limit) || 1000,
    createdBefore: parseInt(req.query.createdBefore) || null,
    createdAfter: parseInt(req.query.createdAfter) || null,
    updatedBefore: parseInt(req.query.updatedBefore) || null,
    updatedAfter: parseInt(req.query.updatedAfter) || null,
    destroyed: (req.query.destroyed === 'true')
  };
  if (req.pagination.limit > 1000) req.pagination.limit = 1000;
  next();
};