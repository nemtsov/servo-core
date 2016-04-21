var async = require('async'),
  moment = require('moment'),
  db = require('_/db'),
  settings = require('_/settings'),
  logger = require('_/logger')('summary'),
  interval;

module.exports = function (cb) {
  if (settings.test) return cb();
  var delay = 5 * 1000 * 60;
  interval = setInterval(summarize, delay);
  summarize();
  cb();
};

function summarize() {
  async.auto({
    apps: db.apps.find.bind(db.apps, {}),
    activity: ['apps', function (cb, results) {
      async.each(results.apps, appActivity, cb);
    }],
    stacks: ['apps', function (cb, results) {
      async.each(results.apps, stackCount, cb);
    }],
    deploys: ['apps', function (cb, results) {
      async.each(results.apps, deployCount, cb);
    }],
    users: ['apps', function (cb) {
      cb(); //TODO add user count when interaction with servo-gateway figured out
    }],
    save: ['activity', 'stacks', 'deploys', 'users', function (cb, results) {
      async.each(results.apps, db.apps.save.bind(db.apps), cb);
    }]
  }, function (err, results) {
    if (err) return logger.warn(err, 'error building summary');
    logger.trace(results, 'summary complete');
  });
}

function appActivity(app, cb) {
  async.auto({
    day: db.events.count.bind(db.events, {
      'context.appId': app.id,
      _createdAt: {$gt: moment().subtract(1, 'days').toDate().valueOf()}
    }),
    week: db.events.count.bind(db.events, {
      'context.appId': app.id,
      _createdAt: {$gt: moment().subtract(7, 'days').toDate().valueOf()}
    }),
    all: db.events.count.bind(db.events, {
      'context.appId': app.id
    })
  }, function (err, results) {
    if (err) return cb(err);
    app.summary.activity = results;
    cb();
  });
}

function stackCount(app, cb) {
  db.stacks.count({appId: app.id}, function (err, count) {
    if (err) return cb(err);
    app.summary.stacks = count;
    cb();
  });
}

function deployCount(app, cb) {
  db.deploys.count({appId: app.id}, function (err, count) {
    if (err) return cb(err);
    app.summary.deploys = count;
    cb();
  });
}
