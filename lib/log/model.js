var error = require('_/error');

// {
//   "id": "12345-67890-12345-67890-12345-67890" //use eventId from CloudWatch
//   "_createdAt": 1234567890,
//   "message": "this is the log line",
//   "deployId": "1a2b3c4d",
//   "workerId": "i-1234567".
//   "source": "?" //need to decide what source looks like
// }

function Log (logEvent) {
  var logStreamInfo = this.parseLogStreamName(logEvent.logStreamName);
  this._createdAt = logEvent.timestamp;
  this.deployId = logStreamInfo.deployId;
  this.workerId = logStreamInfo.workerId;
  this.message = logEvent.message;
  this.id = logEvent.eventId;
}

module.exports = Log;

Log.prototype.parseLogStreamName = function (logStreamName) {
  var info = logStreamName.split('/');
  if (info.length !== 4) throw new error.ServoError('Malformed Stream name ' + logStreamName);
  return {
    app: info[0],
    stack: info[1],
    deployId: info[2],
    workerId: info[3]
  };
};