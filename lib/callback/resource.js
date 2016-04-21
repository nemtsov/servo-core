var callbackSvc = require('./index');

exports.post = function (req, res, next) {
  callbackSvc.receive(req.params.key, req.body, function (err) {
    (err) ? next(err) : res.status(202).end();
  });
};