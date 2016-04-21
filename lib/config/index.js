var error = require('_/error'),
  async = require('async'),
  db = require('_/db'),
  Config = require('./model'),
  crypto = require('crypto'),
  settings = require('_/settings'),
  logger = require('_/logger')('config'),
  eventSvc = require('_/event');

exports.list = list;
exports.decryptConfigs = decryptConfigs;
exports.decrypt = decrypt;

exports.create = function (level, context, fullContext, key, value, secret, md5, cb) {
  var config;
  try {
    config = new Config(level, context, key, value, secret, md5);
  } catch (err) {
    return cb(err);
  }

  async.auto({
    index: db.configs.ensureIndex.bind(db.configs, {level: 1, context: 1, key: 1}, {unique: true}),
    save: ['index', db.configs.save.bind(db.configs, config)]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.save);
  });
};

exports.listResolved = function (appId, stackId, cb) {
  async.auto({
    globalConfig: list.bind({}, 'global', null),
    appConfig: function (cb) {
      if (!appId) return cb(null, []);
      list('app', appId, cb);
    },
    stackConfig: function (cb) {
      if (!stackId) return cb(null, []);
      list('stack', stackId, cb);
    }
  }, function (err, results) {
    if (err) return cb(err);
    var resolvedIndex = {},
      resolved = [];
    function index(config) {
      resolvedIndex[config.key] = config;
    }
    results.globalConfig.forEach(index);
    results.appConfig.forEach(index);
    results.stackConfig.forEach(index);
    Object.keys(resolvedIndex).forEach(function (key) {
      resolved.push(resolvedIndex[key]);
    });
    cb(null, resolved);
  });
};

function list(level, context, options, cb) {
  var query = {level: level};
  if (context) query.context = context;
  db.configs.find(query, options, cb);
}

function decryptConfigs(entries, cb) {
  var err = null,
    decrypted = entries.map(function (entry) {
    try {
      if (entry.encrypted) entry.value = decrypt(entry.value);
    } catch (decryptErr) {
      err = new error.SecurityError('decryption failure', decryptErr);
      logger.error(err);
      return;
    }
    entry.encrypted = false;
    return entry;
  });
  cb(err, decrypted);
}

function decrypt(cipherText) {
  var algorithm = 'aes256',
    key = settings.key,
    decipher = crypto.createDecipher(algorithm, key);
  return decipher.update(cipherText, 'hex', 'utf8') + decipher.final('utf8');
}
