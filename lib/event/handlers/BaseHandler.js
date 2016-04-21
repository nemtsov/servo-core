var async = require('async'),
  db = require('_/db'),
  error = require('_/error');

module.exports = BaseHandler;

function BaseHandler (type) {
  this._type = type;
}

BaseHandler.prototype.handle = function (message, cb) {
  if (!this.match(message)) return cb(false);
  this.consume(message, cb);
};

BaseHandler.prototype.match = function (message) {
  return false;
};

BaseHandler.prototype.contextualizeAsgName = function (AsgName, cb) {
  var handles = AsgName.split('_');
  if (handles.length < 4) return cb(new AmazonError('Malformed ASG name ' + AsgName));
  var appHandle = handles[2],
    stackHandle = handles[3];

  async.auto({
    app: function (cb) {
      db.apps.findOne({handle: appHandle}, cb);
    },
    stack: ['app', function (cb, results) {
      var query = {
        handle: stackHandle,
        appId: results.app.id
      };
      db.stacks.findOne(query, {destroyed: true}, cb);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    var context = {
      appId: results.app.id,
      stackId: results.stack.id
    };
    if (handles[4])
      context.deployId = handles[4];
    cb(null, context);
  });
};