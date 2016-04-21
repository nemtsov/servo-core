module.exports = function Event(type, message, severity, context, timestamp) {
  this.type = type;
  this.message = message;
  this.severity = severity;
  this.context = context;
  this._createdAt = timestamp;
};

/**
{
  type: 'StackCreated',
  message: 'New stack {{stack}} created by {{user}}',
  severity: 'info',
  context: {
    appId: '123abc',
    stackId: '678abc',
    userId: 'def890'
  }
}
**/