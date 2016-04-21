var eventSvc = require('_/event'),
  networkSvc = require('./index.js');

module.exports  = function () {
  eventSvc.on('ConfigChange', networkSvc.onConfigChange);
  eventSvc.on('DeploySuccess', networkSvc.onDeployComplete);
};
