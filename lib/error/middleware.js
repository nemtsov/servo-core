module.exports = function (err, req, res, next) {
  if (!err) {
    if (next) return next();
    else return res.end();
  }
  res.error = err;
  res.status(err.status || 500)
    .json({error: err.name + ': ' + err.message});
};