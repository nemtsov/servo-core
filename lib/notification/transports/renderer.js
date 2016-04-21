var db = require('_/db'),
  async = require('async'),
  settings = require('_/settings');

exports.renderer = function (event, cb) {
  var workerRegex = /{{worker}}/,
    deployRegex = /{{deploy}}/,
    stackRegex = /{{stack}}/,
    appRegex = /{{app}}/,
    app, stack;
  async.auto({
    app: function (cb) {
      if (!event.context.appId) return cb(null);
      db.apps.findById(event.context.appId, cb);
    },
    stack: function (cb) {
      if (!event.context.stackId) return cb(null);
      db.stacks.findById(event.context.stackId, cb);
    },
    render: ['app', 'stack', function (cb, results) {
      if (workerRegex.test(event.message)) {
        event.message = event.message.replace(workerRegex, event.context.workerId);
      }
      if (deployRegex.test(event.message)) {
        event.message = event.message.replace(deployRegex, event.context.deployId);
      }
      if (appRegex.test(event.message)) {
        event.message = event.message.replace(appRegex, results.app.handle);
      }
      if (stackRegex.test(event.message)) {
        event.message = event.message.replace(stackRegex, results.stack.handle);
      }
      cb(null);
    }],
    handle: ['app', 'stack', function (cb, results) {
      event.handle = settings.baseHandle;
      if (results.app) event.handle += ':' + results.app.handle;
      if (results.stack) event.handle += ':' + results.stack.handle;
      cb(null);
    }]
  }, function (err) {
    (err) ? cb(err) : cb(null, event);
  });
};