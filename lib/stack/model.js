var error = require('_/error');

module.exports = function Stack(name, appId) {
  if (!name) throw new error.BadInputError('name is required');
  if (/[^a-zA-Z\d -]+/g.test(name)) {
    throw new error.BadInputError('letters, numbers, spaces and hyphens are allowed in name');
  }
  if (/^\d/g.test(name)) {
    throw new error.BadInputError('name cannot begin with a number');
  }
  this.name = name;
  this.handle = name.replace(/\s/g, '-').toLowerCase();
  this.appId = appId;
  this.summary = {};
  this.platform = null;
  this.assets = {active: {}, pending: {}};
  this.lock = this.appId + ':' + this.handle;
};