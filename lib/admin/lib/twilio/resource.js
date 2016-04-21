import async from 'async';
import db from '_/db';
import * as adminSvc from '_/admin';
import Twilio from './model';

export function getAll(req, res, next) {
  const options = {
    limit: parseInt(req.query.limit) || 999,
    since: parseInt(req.query.since) || null
  };
  if (options.limit > 999) options.limit = 999;

  db.admin.find({type: 'twilio'}, options, (err, data) => {
    if (data.length > options.limit) {
      const last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
};

export function getOne(req, res, next) {
  db.admin.findById(req.params.twilioId, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function post(req, res, next) {
  var twilio;
  try {
    twilio = new Twilio(req.body.accountSid, req.body.token, req.body.phone);
  } catch (err) {
    return next(err);
  }
  adminSvc.create(twilio,(err, data) => {
    (err) ? next(err) : res.status(202).json(data);
  });
}

export function put(req, res, next) {
  const id = req.params.twilioId;
  const {accountSid, token, phone} = req.body;
  const updateBody = {
    accountSid, token, phone
  };
  adminSvc.update(id, updateBody, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
};

export function del(req, res, next) {
  const id = req.params.twilioId;
  adminSvc.destroy(id, (err) => {
    (err) ? next(err) : res.status(204).end();
  });
}
