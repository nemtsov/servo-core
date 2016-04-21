import {getTopic, addSubscription} from './index.js';

export function get(req, res, next) {
  const context = {distribution: req.params.distribution , ...req.context};
  getTopic(context, (err, data) => {
    (err) ? next(err) : res.json(data);
  });
}

export function post(req, res, next) {
  const context = {distribution: req.params.distribution , ...req.context};
  const email = req.body.email;

  addSubscription(context, email, (err, data)=>{
    (err) ? next(err) : res.json(data);
  });
}
