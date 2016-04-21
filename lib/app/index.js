var async = require('async'),
  error = require('_/error'),
  git = require('_/git'),
  db = require('_/db'),
  eventSvc = require('_/event');

function gitURLNormalization (gitUrl, cb) {
  var result = git.normalizeGitUrl(gitUrl);
  if (!result.normalized)
    return cb(new error.BadInputError('Invalid Git Url'));
  git.getRepo(gitUrl, function (err) {
    if (err) {
      if (err.status === 404)
        return cb(new error.BadInputError('The specified repo does not exist or Servo does not have access to it.'));
      return cb(new error.BadInputError(err));
    }
    cb(null, result.normalized);
  });
}

exports.create = function (app, cb) {
  async.auto({
    index: db.apps.ensureIndex.bind(db.apps, 'handle', {unique: true, sparse: true}),
    normalizedSource: gitURLNormalization.bind(null, app.source),
    save: ['index', 'normalizedSource', function (done, results) {
      app.source = results.normalizedSource;
      db.apps.save(app, done);
    }],
    publishEvent: ['save', function (cb, results) {
      //TODO: get user info
      eventSvc.publish('AppCreated', 'App {{app}} created', {appId: results.save.id}, cb);
    }]
  }, function (err, results) {
    cb(err, (!err) ? results.save : null);
  });
};

exports.destroy = function (app, cb) {
  async.auto({
    stackCount: db.stacks.count.bind(db.stacks, {appId: app.id}),
    verify: ['stackCount', function (cb, results) {
      cb((results.stackCount) ? new error.NotEmptyError('stacks exist') : null);
    }],
    removeHandle: ['verify', function (cb) {
      delete app.handle;
      db.apps.save(app, cb);
    }],
    destroy: ['removeHandle', db.apps.destroyById.bind(db.apps, app.id)],
    publishEvent: ['destroy', function (cb) {
      //TODO: get user info
      eventSvc.publish('AppDestroyed', 'App {{app}} destroyed', {appId: app.id}, cb);
    }]
  }, cb);
};