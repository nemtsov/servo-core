var error = require('_/error'),
  hq = require('hyperquest'),
  timeoutWrap = require('callback-timeout'),
  concat = require('concat-stream'),
  parseUrl = require('url').parse;

/**
 * Responsibility:
 *   Provide the GIT HTTP Client
 *
 * Using `hyperquest` instead of `core.HTTPClient`
 * because a streaming api was necessary. This will
 * be updated once `core.HTTPClient` supports
 * returning a stream.
 */

function Client (hub) {
  this._urlPrefix = hub.urlPrefix;
  this._timeoutInMs = 10000;
  if (hub.token)
    this._token = hub.token;
}

module.exports = Client;

Client.prototype.get = function (path, cb) {
  if (cb) cb = timeoutWrap(cb, this._timeoutInMs);
  var headers = {'User-Agent': 'servo'};
  if (this._token)
    headers.Authorization = 'token ' + this._token;
  hq(this.getUrl(path), {headers: headers}, cb);
};

Client.prototype.getJSON = function (path, cb) {
  this.getRes(path, function (err, ressult) {
    if (err) return cb(err);
    cb(null, ressult.body);
  });
};

Client.prototype.getRes = function (path, cb) {
  var self = this;
  function parse(err, res) {
    if (err) return cb(err);
    res.pipe(concat(function (body) {
      try {
        if (res.statusCode > 400) {
          var e = new error.ServoError(self.getUrl(path) + ' returns ' + res.statusCode + ' with ' + body.toString());
          e.status = res.statusCode;
          throw e;
        }
        cb(null, {
          headers: res.headers,
          body: JSON.parse(body)
        });
      } catch (err) {
        cb(err);
      }
    }));
  }

  return self.get(path, parse);
};

Client.prototype.getUrl = function (path) {
  return isUrl(path) ? path : this._urlPrefix + path;
};

function isUrl(path) {
  return !!parseUrl(path).hostname;
}
