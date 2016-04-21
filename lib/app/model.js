var error = require('_/error'),
  reserved = [
    'mongodb',
    'dynamodb',
    's3',
    'sqs',
    'mysql',
    'postgresql',
    'redis',
    'memcached',
    'elasticsearch',
    'twillio',
    'builders'
  ];

module.exports = function App(name, source) {
  if (!name) throw new error.BadInputError('name is required');
  if (reserved.indexOf(name) !== -1) throw new error.BadInputError(name + ' is a reserved word');
  if (!source) throw new error.BadInputError('source is required');
  if (/[^a-zA-Z\d -]+/g.test(name)) {
    throw new error.BadInputError('letters, numbers, spaces and hyphens are allowed in name');
  }
  if (/^\d/g.test(name)) {
    throw new error.BadInputError('name cannot begin with a number');
  }
  this.name = name;
  this.handle = name.replace(/\s/g, '-').toLowerCase();
  this.source = source;
  this.summary = {};
};