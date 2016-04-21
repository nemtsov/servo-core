var db = require('_/db'),
  async = require('async'),
  amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  crypto = require('crypto'),
  logger = require('_/logger')('build/worker'),
  eventSvc = require('_/event');

exports.checkStatus = function () {
  async.auto({
    pending: db.builds.find.bind(db.builds, {state: 'PENDING'}),
    building: db.builds.find.bind(db.builds, {state: 'BUILDING'}),
    checkStatus: ['pending', 'building', function (cb, results) {
      var combined = results.pending.concat(results.building);
      if (!combined.length) return cb();
      async.each(combined, getBuildStatus, cb);
    }]
  }, function (err) {
    if (err) logger.warn('build status error', err);
  });
};

function getBuildStatus(build, cb) {
  var s3 = amazonSvc.service('S3'),
    key = build.key,
    md5 = crypto.createHash('md5').update(key).digest('base64');
  s3.getObject({
    Bucket: settings.s3Bucket,
    Key: 'buildstatus/' + build.id,
    SSECustomerAlgorithm: 'AES256',
    SSECustomerKey: key,
    SSECustomerKeyMD5: md5
  }, function (err, data) {
    if (err && err.name === 'NoSuchKey') return cb(null);
    if (err) {
      logger.warn('error getting build status', err);
      return cb();
    }
    try {
      var status = JSON.parse(data.Body.toString());
      updateBuildStatus(build, status, cb);
    } catch (err) {
      cb();
      return logger.warn('error parsing build status', err);
    }
  });
}

function updateBuildStatus(build, status, cb) {
  var initialState = build.state;
  build.lastStatus = status.timestamp;
  build.state = status.state;
  if (build._createdAt < (new Date().getTime() - 900000) && (build.state === 'BUILDING' || build.state === 'PENDING')) {
    build.state = 'TIMEOUT';
    logger.info('build ' + build.id + ' timed out')
  }
  if (initialState !== status.state)
    logger.info('build ' + build.id + ' changed state to ' + status.state);
  async.auto({
    suspend: function (cb) {
      if (initialState !== 'PENDING') return cb();
      suspendBuilder(status.instanceId, cb);
    },
    move: function (cb) {
      if (status.state !== 'COMPLETE') return cb();
      moveBuild(build, cb);
    },
    publishEvent: function (cb) {
      switch (status.state) {
        case 'COMPLETE':
          eventSvc.publish('BuildSuccess', 'Build {{build}} succeeded', {
            build: build.id
          }, cb);
          break;
        case 'FAILED':
          eventSvc.publish('BuildFailure', 'Build {{build}} failed', {
            build: build.id
          }, cb);
          break;
        default:
          cb();
      }
    },
    save: ['move', 'suspend', db.builds.save.bind(db.builds, build)]
  }, cb);
}

function suspendBuilder(instanceId, cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    asgName = settings.baseHandle.replace(/:/g, '_') + '_' + 'builders';
  autoscaling.detachInstances({
    AutoScalingGroupName: asgName,
    ShouldDecrementDesiredCapacity: false,
    InstanceIds: [instanceId]
  }, function (err) {
    logger.info('detaching builder from group', instanceId);
    if (err) logger.warn('error detaching builder', err);
    cb();
  });
}

function moveBuild(build, cb) {
  var s3 = amazonSvc.service('S3'),
    key = build.key,
    md5 = crypto.createHash('md5').update(key).digest('base64');
  logger.info('moving build from postbuild', build.id);
  s3.copyObject({
    Bucket: settings.s3Bucket,
    CopySource: settings.s3Bucket + '/postbuild/' + build.id,
    Key: 'build/' + build.id,
    CopySourceSSECustomerAlgorithm: 'AES256',
    CopySourceSSECustomerKey: key,
    CopySourceSSECustomerKeyMD5: md5
  }, cb);
}