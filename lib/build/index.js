var db = require('_/db'),
  async = require('async'),
  gitSvc = require('_/git'),
  Build = require('./model'),
  amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  platformSvc = require('_/platform'),
  crypto = require('crypto'),
  error = require('_/error'),
  logger = require('_/logger')('build'),
  eventSvc = require('_/event'),
  configSvc = require('_/config'),
  detector = require('./detector');

function ensureIndex (cb) {
  async.auto({
    getAll: function (done) {
      db.builds.ensureIndex({source: 1}, done);
    },
    existing: function (done) {
      db.builds.ensureIndex({'commit.sha': 1}, done);
    },
    update: function (done) {
      db.builds.ensureIndex({source: 1, _updatedAt: -1}, done);
    }
  }, cb);
}

exports.createBuild = function (app, sha, cb) {
  var git = gitSvc.normalizeGitUrl(app.source);
  //TODO check if commit is already built
  logger.info('new build requested', app.source, sha);
  async.auto({
    ensureIndex: ensureIndex,
    existing: function (cb) {
      db.builds.find({'commit.sha': sha}, function (err, data) {
        if (err) return cb(err);
        var existing = false;
        data.forEach(function (build) {
          if (build.state !== 'FAILED' && build.state !== 'TIMEOUT') existing = true;
        });
        (existing) ? cb(new error.ConflictError('a build for this commit already exists')) : cb();
      });
    },
    commit: gitSvc.getCommit.bind(gitSvc, app.source, sha),
    manifest: function (cb) {
      gitSvc.getManifest(app.source, sha, function (err, manifest) {
        if (manifest) return cb(null, manifest);
        detector(app.source, sha, cb);
      });
    },
    validatedManifest: ['manifest', function (cb, results) {
      platformSvc.validateManifest(results.manifest, cb);
    }],
    key: function (cb) {
      crypto.randomBytes(32, function (err, buf) {
        cb(err, buf.toString('ascii'));
      });
    },
    md5: ['key', function (cb, results) {
      cb(null, crypto.createHash('md5').update(results.key).digest('base64'));
    }],
    build: ['commit', 'validatedManifest', 'key', 'existing', function (cb, results) {
      var build = new Build(
        results.commit,
        results.validatedManifest,
        git.normalized,
        results.key);
      db.builds.save(build, cb);
    }],
    publishEvent: ['build', function (cb, results) {
      //TODO: get user info
      eventSvc.publish('BuildStarted', 'Build {{build}} created', {
        buildId: results.build.id
      }, cb);
    }],
    uploadArchive: ['build', 'key', 'md5', function (cb, results) {
      var buffer;
      gitSvc.getArchiveStream(git.normalized, sha, function (err, stream) {
        if (err) return cb(err);
        var bufs = [];
        stream.on('data', function (d) {
          bufs.push(d);
        });
        stream.on('end', function () {
          buffer = Buffer.concat(bufs);
          uploadBuffer();
        });
      });
      function uploadBuffer() {
        var s3 = amazonSvc.service('S3');
        s3.upload({
          Bucket: settings.s3Bucket,
          Key: 'prebuild/' + results.build.id,
          Body: buffer,
          SSECustomerAlgorithm: 'AES256',
          SSECustomerKey: results.key,
          SSECustomerKeyMD5: results.md5
        }, function (err) {
          if (err) {
            err = new error.AmazonError('s3.putObject', err);
            logger.warn('error uploading prebuild', err);
          }
          (err) ? cb(err) : cb(null);
        });
      }
    }],
    builderConfig: function (cb) {
      var query = {level: 'app', context: app.id, key: 'DockerRegistryAuth'};
      db.configs.find(query, function (err, entries) {
        if (err) return cb(err);
        if (!entries.length) return cb();
        configSvc.decryptConfigs(entries, cb);
      })
    },
    uploadConfig: ['builderConfig', 'build', 'key', 'md5', function (cb, results) {
      if (!results.builderConfig || !results.builderConfig[0]) return cb();
      var s3 = amazonSvc.service('S3'),
        filter = /(\w+):(.+)@(.+)/.exec(results.builderConfig[0].value),
        body = {docker: {auth: {
          user: filter[1],
          password: filter[2],
          registry: filter[3]
        }}};
      if (!filter[1] || !filter[2] || !filter[3]) {
        return cb(new error.BadInputError('Malformed DockerRegistryAuth value'));
      }
      s3.upload({
        Bucket: settings.s3Bucket,
        Key: 'buildconfig/' + results.build.id,
        Body: JSON.stringify(body),
        SSECustomerAlgorithm: 'AES256',
        SSECustomerKey: results.key,
        SSECustomerKeyMD5: results.md5
      }, function (err) {
        if (err) {
          err = new error.AmazonError('s3.putObject', err);
          logger.warn('error uploading buildconfig', err);
        }
        cb(err);
      });
    }],
    enqueue: ['uploadArchive', 'uploadConfig', function (cb, results) {
      var sqs = amazonSvc.service('SQS'),
        body = {
          buildId: results.build.id,
          bucket: settings.s3Bucket,
          prebuildKey: 'prebuild/' + results.build.id,
          postbuildKey: 'postbuild/' + results.build.id,
          statusKey: 'buildstatus/' + results.build.id,
          key: results.key,
          commands: results.validatedManifest.build.commands
        };
      if (results.builderConfig) body.buildconfig = 'buildconfig/' + results.build.id;
      sqs.sendMessage({
        QueueUrl: settings.builderQueueUrl,
        MessageBody: JSON.stringify(body)
      }, function (err) {
        (err) ? cb(new error.AmazonError('sqs.sendMessage', err)) : cb(null);
      });
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.build);
  });
};

exports.getReport = function (build, cb) {
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
    if (err && err.name === 'NoSuchKey') return cb(new error.AmazonError('report is removed from s3'));
    if (err) return cb(new error.AmazonError('s3.getObject', err));
    try {
      var status = JSON.parse(data.Body.toString());
      cb(null, {
        log: status.log,
        stderr: status.stderr,
        stdout: status.stdout,
        builder: status.instanceId
      });
    } catch (err) {
      return cb(new error.ServoError('error parsing build output', err));
    }
  });
};

exports.getArtifactLink = function (build, cb) {
  var s3 = amazonSvc.service('S3');
  s3.getSignedUrl('getObject', {Bucket: settings.s3Bucket, Key: 'build/' + build.id}, function (err, url) {
    (err) ? cb(err) : cb(null, {url: url});
  })
};