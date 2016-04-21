var eventSvc = require('_/event'),
  workerSvc = require('./index.js');

module.exports  = function () {
  eventSvc.on('WorkerCreated', workerSvc.onWorkerCreated);
  eventSvc.on('WorkerDestroyed', workerSvc.onWorkerDestroyed);
};
