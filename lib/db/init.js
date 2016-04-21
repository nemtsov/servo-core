var collections = require('./index'),
  MongoClient = require('mongodb').MongoClient,
  settings = require('_/settings'),
  error = require('_/error'),
  logger = require('_/logger')('database'),
  Collection = require('./collection'),
  async = require('async');

module.exports = function (cb) {
  if (settings.mockDb) {
    return require('_/mock/mongo/data').init(function () {
      initCollections(require('_/mock/mongo').db);
      (settings.initDb) ? initDb(cb) : cb();
    });
  }
  MongoClient.connect(settings.mongoUri, function (err, db) {
    if (err) return cb(err);
    initCollections(db);
    logger.info('successfully connected to database');
    initDb(cb);
  });
};

function initCollections(db) {
  collections.apps = new Collection(db, 'apps');
  collections.stacks = new Collection(db, 'stacks');
  collections.configs = new Collection(db, 'configs');
  collections.deploys = new Collection(db, 'deploys');
  collections.events = new Collection(db, 'events');
  collections.notifications = new Collection(db, 'notifications');
  collections.git = new Collection(db, 'git');
  collections.builds = new Collection(db, 'builds');
  collections.callbacks = new Collection(db, 'callbacks');
  collections.admin = new Collection(db, 'admin');
  collections.notificationRules = new Collection(db, 'notificationRules');
  collections.notificationDelivery = new Collection(db, 'notificationDelivery');
  collections.workers = new Collection(db, 'workers');
  collections.addressBooks = new Collection(db, 'addressBooks');
}

function initDb(cb) {
  var db = collections;
  async.auto({
    app: db.apps.find.bind(db.apps, {handle: 'servo-core'}),
    createApp: ['app', function (cb, results) {
      if (results.app.length) return cb();
      db.apps.save({
        name: 'Servo Core',
        handle: 'servo-core',
        summary: {}
      }, cb);
    }]
  }, cb);
}
