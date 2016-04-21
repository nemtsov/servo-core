var crypto = require('crypto'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('database'),
  indexCache = [];

module.exports = Collection;

function Collection(db, name) {
  this._collection = db.collection(name);
  this._name = name;
}

Collection.prototype.save = function (doc, cb) {
  if (!doc.id) {
    this._insert(doc, done);
  } else {
    this._update(doc, done);
  }

  function done(err, results) {
    if (err && err.name === 'MongoError' && err.code === 11000)
      return cb(new error.ConflictError('data conflict'));
    if (err && err.message === 'duplicate key error index')
      return cb(new error.ConflictError('data conflict duplicate key'));
    if (err) return cb(err);
    delete results._id;
    cb(null, results);
  }
};

Collection.prototype.find = function (query, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var limit = (options.limit) ? options.limit : 1000;
  if (options.destroyed !== true) query._destroyed = {$ne: true};
  if (options.createdBefore) query._createdAt = {$lte: options.createdBefore};
  if (options.createdAfter) query._createdAt = {$gte: options.createdAfter};
  if (options.updatedBefore) query._updatedAt = {$lte: options.updatedBefore};
  if (options.updatedAfter) query._updatedAt = {$gte: options.updatedAfter};
  this._collection.find(query, {_id: 0})
    .sort({_createdAt: -1})
    .limit(limit + 1)
    .toArray(cb.bind(null));
};

Collection.prototype.findOne = function (query, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var name = this._name;
  this.find(query, options, function (err, docs) {
    if (err) return cb(err);
    if (docs.length === 0)
      return cb(new error.NotFoundError('not found in ' + name));
    if (docs.length > 1)
      return cb(new error.DatabaseError('more than one document found'));
    cb(null, docs[0]);
  });
};

Collection.prototype.findById = function (id, cb) {
  var name = this._name;
  this._collection.findOne({id: id}, {_id: 0}, function (err, doc) {
    if (err) return cb(err);
    if (!doc) return cb(new error.NotFoundError('not found in ' + name));
    cb(null, doc);
  });
};

Collection.prototype.updateById = function (id, update, cb) {
  update._updatedAt = new Date().getTime();
  this._collection.update({id: id}, {$set: update}, cb);
};

Collection.prototype.destroyById = function (id, cb) {
  var update = {$set: {
    _destroyed: true,
    _destroyedAt: new Date().getTime()
  }};
  this._collection.update({id: id}, update, cb);
};

Collection.prototype.removeById = function (id, cb) {
  this._collection.remove({id: id}, true, cb);
};

Collection.prototype.count = function (query, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  if (options.destroyed !== true) query._destroyed = {$ne: true};
  this._collection.count(query, cb);
};

Collection.prototype.ensureIndex = function (keys, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var name = this._name,
    indexString = JSON.stringify({keys: keys, options: options});
  if (indexCache.indexOf(indexString) !== -1) return cb(null);
  this._collection.ensureIndex(keys, options, function (err) {
    logger.info('ensured index on ' + name, keys, options);
    if (!err) indexCache.push(indexString);
    cb(err);
  });
};

Collection.prototype._generateId = function (cb) {
  crypto.randomBytes(5, function (err, buffer) {
    if (err) return cb(err);
    cb(null, buffer.toString('hex'));
  });
};

Collection.prototype._insert = function (doc, cb) {
  var self = this;
  doc._createdAt = doc._createdAt || new Date().getTime();
  doc._updatedAt = doc._createdAt || new Date().getTime();

  async.auto({
    id: this._generateId,
    index: this.ensureIndex.bind(this, 'id', {unique: true}),
    save: ['id', 'index', function (cb, results) {
      doc.id = results.id;
      self._collection.insert(doc, cb);
    }]
  }, function (err, results) {
    cb(err, (results.save && results.save[0]) ? results.save[0] : null);
  });
};

Collection.prototype._update = function (doc, cb) {
  doc._updatedAt = new Date().getTime();

  this._collection.update({id: doc.id}, doc, function (err, result) {
    if (err) return cb(err);
    if (result === 0)
      return cb(new error.DatabaseError('failed to update document'));
    cb(null, doc);
  });
};
