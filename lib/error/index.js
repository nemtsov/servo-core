var generateClass = require('common-errors').helpers.generateClass,
  errors;

errors = {
  ServoError: generateClass("ServoError"),
  NotFoundError: generateClass("NotFoundError"),
  NotEmptyError: generateClass("NotEmptyError"),
  ConflictError: generateClass("ConflictError"),
  BadInputError: generateClass("BadInputError"),
  DatabaseError: generateClass("DatabaseError"),
  SecurityError: generateClass("SecurityError"),
  TimeoutError: generateClass("TimeoutError"),
  AmazonError: generateClass("AmazonError")
};

errors.NotFoundError.prototype.status = 404;
errors.NotEmptyError.prototype.status = 400;
errors.ConflictError.prototype.status = 409;
errors.BadInputError.prototype.status = 400;
errors.TimeoutError.prototype.status = 408;
errors.AmazonError.prototype.status = 503;

module.exports = errors;