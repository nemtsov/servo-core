import async from 'async';
import db from '_/db';
import Logger from '_/logger';

const logger = Logger('AdminConfig');


exports.getGitSource = function (source, cb) {
  db.admin.find({type: 'gitSource', source: source}, cb);
};

exports.getOpsgenie = function (cb) {
  db.admin.find({type: 'opsgenie'}, cb);
};

exports.getSlackInstance = function (team, cb) {
  db.admin.find({type: 'slack', team: team}, cb);
};

exports.getSlackInstances = function (cb) {
  db.admin.find({type: 'slack'}, cb);
};

exports.getTwilio = function (cb) {
  db.admin.find({type: 'twilio'}, cb);
};

export function create(adminConfig, cb) {
  async.auto({
    index: db.admin.ensureIndex.bind(db.admin, {id: 1}, {unique: true}),
    save: ['index', db.admin.save.bind(db.admin, adminConfig)],
    event: ['save', (cb) => cb()] //TODO make real when event service converted
  }, (err, result) => {
    cb(err, (!err) ? result.save : null);
  });
}

export function destroy(id, cb) {
  async.auto({
    adminConfig: db.admin.findById.bind(db.admin, id),
    destroy: ['adminConfig', db.admin.destroyById.bind(db.admin, id)],
    event: ['destroy', (cb) => cb()] //TODO make real when event service converted
  }, cb);
}

export function update(id, updateBody, cb) {
  async.auto({
    adminConfig: db.admin.findById.bind(db.admin, id),
    update: ['adminConfig', (cb, results) => {
      db.admin.updateById.apply(db.admin, [id, updateBody, cb]);
    }],
    event: ['update', (cb) => cb()], //TODO make real when event service converted
    config: ['update', db.admin.findById.bind(db.admin, id)]
  }, (err, result) => {
    cb(err, (!err) ? result.config : null);
  });
}
