var async = require('async'),
  error = require('_/error'),
  db = require('_/db'),
  platformSvc = require('_/platform'),
  logger = require('_/logger')('stack'),
  eventSvc = require('_/event');

exports.create = function (stack, cb) {
  logger.info('creating new stack', stack.id);
  async.auto({
    index: db.stacks.ensureIndex.bind(db.stacks, {lock: 1}, {unique: true, sparse: true}),
    save: ['index', db.stacks.save.bind(db.stacks, stack)],
    publishEvent: ['save', function (cb, results) {
      eventSvc.publish('StackCreated', 'Stack {{stack}} created', {
        stackId: results.save.id,
        appId: results.save.appId
      }, cb);
    }]
  }, function (err, results) {
    cb(err, (!err) ? results.save : null);
  });
};

exports.destroy = function (stack, cb) {
  //TODO ensure no active deployments
  logger.info('destroying stack', stack.id);
  async.auto({
    onGoingDeployment: function (done) {
      db.deploys.find({lock: stack.id}, function (err, docs) {
        if (err) return done(err);
        if (docs.length > 0) return done(new error.ConflictError('Stack cannot be deleted during deploy'));
        done();
      });
    },
    destroyResources: ['onGoingDeployment', platformSvc.initiateDestroy.bind(platformSvc, stack.id, stack.appId)],
    removeHandle: ['destroyResources', function (cb) {
      delete stack.handle;
      delete stack.lock;
      db.stacks.save(stack, cb);
    }],
    destroy: ['removeHandle', db.stacks.destroyById.bind(db.stacks, stack.id)],
    publishEvent: ['destroy', function (cb) {
      //TODO get user info
      eventSvc.publish('StackDestroyed', 'Stack {{stack}} destroyed', {
        stackId: stack.id,
        appId: stack.appId
      }, cb);
    }]
  }, cb);
};