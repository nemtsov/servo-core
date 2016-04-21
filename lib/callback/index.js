var error = require('_/error'),
  async = require('async'),
  crypto = require('crypto'),
  db = require('_/db'),
  Callback = require('./model'),
  settings = require('_/settings');

exports.register = function (module, method, data, cb) {
  async.auto({
    key: function (cb) {
      crypto.randomBytes(64, function (err, buffer) {
        cb(err, (buffer) ? buffer.toString('hex') : null);
      });
    },
    save: ['key', function (cb, results) {
      var callback = new Callback(module, method, data, results.key);
      db.callbacks.save(callback, cb);
    }]
  }, function (err, results) {
    results.save.url = settings.baseUrl + '/callbacks/' + results.key;
    cb(err, results.save.url);
  });
};

exports.receive = function (key, response, cb) {
  async.auto({
    callback: db.callbacks.findOne.bind(db.callbacks, {key: key}),
    execute: ['callback', function (cb, results) {
      try {
        require.resolve(results.callback.module);
      } catch (err) {
        return cb(new error.ServoError('invalid callback module'));
      }
      var module = require(results.callback.module),
        handler = module[results.callback.method];
      if (typeof handler !== 'function')
        return cb(new error.ServoError('invalid callback method'));
      handler(results.callback, response, cb);
    }]
  }, cb);
};