var amazonSvc = require('_/amazon'),
  logs = amazonSvc.service('CloudWatchLogs'),
  crypto = require('crypto'),
  error = require('_/error');

module.exports = function (event, cb) {
  new LogSearch(event, cb);
};

function LogSearch(request, cb) {
  if (!request.limit) request.limit = 1000;
  if (request.limit > 1001) request.limit = 1000;
  if (!request.start)
    request.start = new Date(new Date().getTime() - 60 * 60000).getTime();
  if (!request.end)
    request.end = new Date().getTime();
  if (request.filter) request.filter = decodeURIComponent(request.filter);

  this.request = request;
  this.events = [];
  this.start = new Date().getTime();

  this.getEvents(cb);
}

LogSearch.prototype.getEvents = function (cb) {
  var self = this,
    params = {
      logGroupName: this.request.org + '/' + this.request.region + '/' + this.request.app + '/' + this.request.stack,
      interleaved: false,
      startTime: this.request.start,
      endTime: this.request.end
    };
  if (this.request.filter) params.filterPattern = this.request.filter;
  if (!this.request.filter) params.limit = this.request.limit;
  getPage();

  function getPage(next) {
    if (next) params.nextToken = next;
    if ((self.start + 8000) <= new Date().getTime())
      return cb(new error.TimeoutError('Search timed out, please refine your search'));
    logs.filterLogEvents(params, function (err, data) {
      if (err) return cb(err);
      data.events.forEach(function (event) {
        self.events.push(new Entry(event, event.logStreamName));
      });
      if (self.events.length >= self.request.limit) return sortEvents();
      (data.nextToken) ? getPage(data.nextToken) : sortEvents();
    });
  }

  function sortEvents() {
    var next;
    self.events.sort(function (a, b) {
      if (a._createdAt > b._createdAt) return 1;
      if (a._createdAt < b._createdAt) return -1;
      return 0;
    });
    if (self.events.length <= self.request.limit) {
      next = self.request.end;
    } else {
      self.events = self.events.slice(0, self.request.limit + 1);
      next = self.events.pop()._createdAt;
    }
    cb(null, {events: self.events, next: next});
  }
};

function Entry(event, stream) {
  var streamInfo = parseStreamName(stream),
    sha = crypto.createHash('sha1');
  sha.update(event.message + event.timestamp + streamInfo.workerId);
  this._createdAt = event.timestamp;
  this.deployId = streamInfo.deployId;
  this.workerId = streamInfo.workerId;
  this.message = event.message;
  this.id = sha.digest('hex');
}

function parseStreamName (logStreamName) {
  var info = logStreamName.split('/');
  return {
    stream: info[0],
    deployId: info[1],
    workerId: info[2]
  };
}