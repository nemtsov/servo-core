var error = require('_/error'),
  settings = require('_/settings');

module.exports = function Distribution(id) {
  if (/[^a-z\d-]+/g.test(id)) {
    throw new error.BadInputError('lowercase letters, numbers and hyphens are allowed in id');
  }
  if (/^\d/g.test(id)) {
    throw new error.BadInputError('id cannot begin with a number');
  }
  if (!id) throw new error.BadInputError('id is required');
  this.id = id.toLowerCase();
  this.endpoint = this.id + '.dist.' + settings.org + '.' + settings.route53Domain;
};

/*
{
  id: 'sample-distribution',
  endpoint: 'sample-distribution.dist.foo.example.com'
}
 */
