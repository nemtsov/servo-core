require('dotenv-safe').load({silent: true});
require('babel/register');
var async = require('async'),
  logger = require('_/logger')('main'),
  events = require('events'),
  emitter = exports.events = new events.EventEmitter();

exports.app = null;

process.title = 'servo-core';
require('http').globalAgent.maxSockets = 4000;
require('https').globalAgent.maxSockets = 4000;

async.auto({
  settings: require('_/settings/init'),
  db: require('_/db/init'),
  server: ['settings', 'db', require('_/server/init')],
  summary: ['settings', 'db', require('_/summary/init')],
  queue: ['settings', 'db', require('_/queue/init')],
  build: ['settings', 'db', require('_/build/init')],
  worker: ['settings', 'db', require('_/worker/init')],
  newrelic: ['settings', 'db', require('_/newrelic/init')],
  network: ['settings', 'db', require('_/network/init')],
  distributeEvents: ['settings', 'db', require('_/event/distributor')],
  notifications: ['settings', 'db', require('_/notification/init')]
}, function (err) {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  emitter.emit('initialized');
  logger.info('initialization complete');
});
