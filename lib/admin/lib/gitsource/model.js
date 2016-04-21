var error = require('_/error');

module.exports = function gitSource(source, urlPrefix, token) {
  if (!source) throw new error.BadInputError('git source is required');
  if (!urlPrefix) throw new error.BadInputError('git urlPrefix is required');
  if (!token) throw new error.BadInputError('token is required');
  this.source = source;
  this.urlPrefix = urlPrefix;
  this.token = token;
  this.type = "gitSource";
};