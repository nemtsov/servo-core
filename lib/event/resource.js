var db = require('_/db');

exports.getAll = function (req, res, next) {
  var query = determineQuery(req);
  db.events.find(query, req.pagination, function (err, data) {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

function determineQuery(req) {
  if (!req.context) return {};
  if (req.context.stack) return {'context.stackId': req.context.stack.id};
  if (req.context.app) return {'context.appId': req.context.app.id};
}