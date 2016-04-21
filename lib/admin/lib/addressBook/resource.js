import async from 'async';
import Logger from '_/logger';
import error from '_/error';
import * as addressBookSvc from './index.js'

export function getAll (req, res, next) {
  addressBookSvc.getAll(req.pagination, (err, data) => {
    if (data.length > req.pagination.limit) {
      var last = data.pop();
      res.set('Next', last._createdAt);
    }
    (err) ? next(err) : res.json(data);
  });
}

export function post (req, res, next) {
  addressBookSvc.create(req.body.name, req.body.addresses, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
}

export function put (req, res, next) {
  addressBookSvc.update(req.params.addressBookId, req.body.name, req.body.addresses, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
}

export function del (req, res, next) {
  addressBookSvc.remove(req.params.addressBookId, (err, data) => {
    (err) ? next(err) : res.status(204).end();
  });
}
