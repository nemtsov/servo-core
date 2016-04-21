module.exports = Deployment;

function Deployment(appId, stackId, buildId, config, description) {
  this.appId = appId;
  this.stackId = stackId;
  this.buildId = buildId;
  this.config = config;
  this.state = 'PENDING';
  this.stateReason = 'initializing';
  this.lock = stackId;
  this.description = description;
}

/*
Available States
  PENDING
  BUILDING
  COMPLETE
  REVERTING
  FAILED
*/