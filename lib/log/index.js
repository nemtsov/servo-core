var async = require('async'),
  LogModel = require('./model'),
  settings = require('_/settings'),
  amazonSvc = require('_/amazon'),
  lambda = amazonSvc.service('Lambda'),
  logSvc = amazonSvc.service('CloudWatchLogs'),
  logger = require('_/logger')('log'),
  error = require('_/error'),
  retrieval = require('./retrieval'),
  org = settings.org,
  region = settings.region,
  streamCache = {},
  groupCache =  {};

module.exports.getLogSources = function (cb) {
  var logGroupPrefix = [org, region].join('/'),
    logStreamPrefix = [],
    params = {logGroupNamePrefix: logGroupNamePrefix};

  function getLogGroups (done) {
    var now = new Date().valueOf();
    if (groupNameCache[logGroupPrefix] && (now - groupNameCache[logGroupPrefix].timestamp) < 60 * 1000) {
      return done(null, groupCache[logGroupPrefix].loglogGroups);
    }

    function listLogGroups(logGroups, params, done) {
      logSvc.describeLogGroups(params, function (err, data) {
        if (err) return done(err);
        if (data.logGroups.length === 0) return done(null, logGroups);
        logGroups = logGroups.concat(data.logGroups);
        if (data.nextToken) {
          params.nextToken = data.nextToken;
          return listLogGroups(logGroups, params, done);
        }
        done(null, logGroups);
      });
    }
    listLogGroups([], params, function (err, logGroups) {
      if (err) return done(err);
      groupNameCache[logGroupPrefix] = {loglogGroups: loglogGroups, timestamp: now};
      return done(null, loglogGroups);
    });
  }

  function parseSource(logGroupName, done) {
    logGroupName = logGroup.split('/');
    if (logGroupName.length !== 3) return done();
    done(null, logGroupName[2]);
  }

  function getValidSource(source, done) {
    done(source);
  }

  async.auto({
    logGroups: getLogGroups,
    logSources: ['logGroups', function (done, results) {
      parseSource(results.logGroups, function (err, sources) {
        if (err) return done(err);
        async.filter(sources, getValidSource, done);
      });
    }]
  }, function (err, results) {
    if (err) return cb(err);
    cb(null, results.logSources);
  });
};

module.exports.getLogEntries = function (app, stack, source, options, cb) {
  var payload = {
    app: app,
    stack: stack,
    source: source,
    region: settings.region,
    org: settings.org,
    start: options.createdAfter,
    end: options.createdBefore,
    limit: options.limit,
    filter: options.filter
  };
  retrieval(payload, function (err, data) {
    if (err) return cb(err);
    if (data.error) return cb(new error.AmazonError(data.error));
    cb(null, data.events, data.next);
  })
};