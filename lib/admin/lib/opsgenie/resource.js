import async from 'async';
import db from '_/db';
import Opsgenie from './model';
import * as adminSvc from '_/admin';

export function getAll(req, res, next) {
  const options = {
    limit: parseInt(req.query.limit) || 999,
    since: parseInt(req.query.since) || null
  };
  if (options.limit > 999) options.limit = 999;

  db.admin.find({type: 'opsgenie'}, options, (err, data) => {
    if (data.length > options.limit) {
      const last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

export function getOne(req, res, next) {
  db.admin.findById(req.params.opsgenieId, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function post(req, res, next) {
  var opsgenie;
  try {
    opsgenie = new Opsgenie(req.body.url, req.body.key);
  } catch (err) {
    return next(err);
  }
  adminSvc.create(opsgenie, (err, data) => {
    (err) ? next(err) : res.status(202).json(data);
  });
}

export function put(req, res, next) {
  const id = req.params.opsgenieId;
  const {url, key} = req.body;
  const updateBody = {
    url, key
  };
  adminSvc.update(id, updateBody, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function del(req, res, next) {
  const id = req.params.opsgenieId;
  adminSvc.destroy(id, (err) => {
    (err) ? next(err) : res.status(204).end();
  });
}
