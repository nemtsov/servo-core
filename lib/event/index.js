var db = require('_/db'),
  logger = require('_/logger')('event'),
  Event = require('./model'),
  async = require('async'),
  events = require('events'),
  emitter = new events.EventEmitter();

emitter.setMaxListeners(100);

exports.publish = function (type, message, context, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var severity = options.severity || 'info',
    timestamp = options.timestamp,
    event = new Event(type, message, severity, context, timestamp);
    
  async.auto({
    indexAppId: db.events.ensureIndex.bind(db.events, 'context.appId', {sparse: true}),
    indexStackId: db.events.ensureIndex.bind(db.events, 'context.stackId', {sparse: true}),
    event: db.events.save.bind(db.events, event),
    emit: ['event', function (cb, results) {
      emitter.emit(results.event.type, results.event);
      emitter.emit('*', results.event);
      cb();
    }],
    log: ['emit', function (cb, results) {
      logger.info('event published', JSON.stringify(results.event));
      cb();
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.event);
  });
};

exports.get = function (eventId, cb) {
  db.events.findById(eventId, cb);
};

exports.on = emitter.on.bind(emitter);