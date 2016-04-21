import eventSvc from '_/event';
import newrelicSvc from './index.js';

export default function () {
  eventSvc.on('DeployStarted',  (event) => {
    const context = event.context;
    newrelicSvc.postDeploymentEvent('Deploy ' + context.deployId + ' started at ' + new Date(event._createdAt), context);
  });

  eventSvc.on('DeploySuccess', (event) => {
    const context = event.context;
    newrelicSvc.postDeploymentEvent('Deploy ' + context.deployId + ' succeeded at ' + new Date(event._createdAt), context);
  });

  eventSvc.on('DeploySuccess', (event) => {
    const context = event.context;
    newrelicSvc.saveNewRelicLink(context);
  });

  eventSvc.on('DeployFailure', (event) => {
    const context = event.context;
    newrelicSvc.postDeploymentEvent('Deploy ' + context.deployId + ' failed at ' + new Date(event._createdAt), context);
  });
};
