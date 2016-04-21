import async from 'async';
import db from '_/db';
import * as adminSvc from '_/admin';
import Slack from './model';

export function getAll(req, res, next) {
  var options = {
    limit: parseInt(req.query.limit) || 999,
    since: parseInt(req.query.since) || null
  };
  if (options.limit > 999) options.limit = 999;

  db.admin.find({type: 'slack'}, options, (err, data) => {
    if (data.length > options.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

export function getOne(req, res, next) {
  db.admin.findById(req.params.slackId, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function post(req, res, next) {
  var slack;
  try {
    slack = new Slack(req.body.team, req.body.webhookUrl);
  } catch (err) {
    return next(err);
  }
  adminSvc.create(slack, (err, data) => {
    (err) ? next(err) : res.status(202).json(data);
  });
};

export function put(req, res, next) {
  const id = req.params.slackId;
  const {team, webhookUrl} = req.body;
  const updateBody = {
    team, webhookUrl
  };
  adminSvc.update(id, updateBody, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function del(req, res, next) {
  const id = req.params.slackId;
  adminSvc.destroy(id, (err) => {
    (err) ? next(err) : res.status(204).end();
  });
};
