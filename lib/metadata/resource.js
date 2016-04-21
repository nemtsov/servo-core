var db = require('_/db'),
  admin = require('_/admin'),
  async = require('async');

exports.getAllEventTypes = function (req, res) {
  res.json([
    {type: 'Scaling:Decrease'},
    {type: 'Scaling:Increase'},
    {type: 'Scaling:Unknown'},
    {type: 'Worker:Launch'},
    {type: 'Worker:Terminate'},
    {type: 'Worker:Status'},
    {type: 'Analysis:Complete'},
    {type: 'Deploy:Start'},
    {type: 'Deploy:Complete'},
    {type: 'Deploy:Revert'},
    {type: 'Deploy:Fail'},
    {type: 'Performance:Health'},
    {type: 'Performance:StatusCheck'},
    {type: 'App:Create'},
    {type: 'App:Destroy'},
    {type: 'Stack:Create'},
    {type: 'Stack:Destroy'}
  ]);
};

exports.getNotificationTransports = function (req, res, next) {
  async.auto({
    slack: function (cb) {
      admin.getSlackInstances(function (err, instances) {
        if (err) return cb(err);
        var slack = instances.reduce(function (trasnsport, instance) {
          if (!trasnsport.id) trasnsport.id = 'Slack';
          trasnsport.teams.push(instance.team);
          return trasnsport;
        }, {teams: [], type: 'Slack'});
        if (slack.teams.length === 0)
          slack = null;
        cb(null, slack);
      });
    },
    twilio: function (cb) {
      admin.getTwilio(function (err, docs) {
        if (err) return cb(err);
        if (docs.length === 0) return cb();
        cb(null, {id: docs[0].id, type: 'Twilio'});
      });
    },
    opsgenie: function (cb) {
      admin.getOpsgenie(function (err, docs) {
        if (err) return cb(err);
        if (docs.length === 0) return cb();
        cb(null, {id: docs[0].id, type: 'OpsGenie'});
      });
    }
  }, function (err, results) {
    if (err) return next(err);
    var transports = [];
    if (results.slack) transports.push(results.slack);
    if (results.twilio) transports.push(results.twilio);
    if (results.opsgenie) transports.push(results.opsgenie);
    res.json(transports);
  });
};
