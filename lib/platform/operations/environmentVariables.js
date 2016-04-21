var crypto = require('crypto'),
  async = require('async'),
  configSvc = require('_/config'),
  amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  error = require('_/error');

exports.setup = function (job, cb) {
  if (job.envKey) return cb();
  async.auto({
    key: function (cb) {
      crypto.randomBytes(32, function (err, buf) {
        cb(err, buf.toString('ascii'));
      });
    },
    md5: ['key', function (cb, results) {
      cb(null, crypto.createHash('md5').update(results.key).digest('base64'));
    }],
    decryptedConfig: configSvc.decryptConfigs.bind(configSvc, job.deploy.config),
    script: ['decryptedConfig', function (cb, results) {
      cb(null, constructScript(results.decryptedConfig, job));
    }],
    upload: ['key', 'md5', 'script', function (cb, results) {
      var s3 = amazonSvc.service('S3');
      s3.putObject({
        Bucket: settings.s3Bucket,
        Key: 'config/' + job.deploy.id,
        Body: results.script,
        SSECustomerAlgorithm: 'AES256',
        SSECustomerKey: results.key,
        SSECustomerKeyMD5: results.md5,
        ACL: 'private'
      }, cb);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    if (results.upload.SSECustomerKeyMD5 !== results.md5)
      return cb(new error.SecurityError('key md5 mismatch'));
    job.envKey = new Buffer(results.key).toString('base64');
    job.envKeyMd5 = results.md5;
    cb();
  });
};

exports.revert = function (job, cb) {
  delete job.envKey;
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};

function constructScript(entries, job) {
  var script = '',
    org = settings.baseHandle.split(':')[0],
    handle = org + ':' + settings.region + ':' + job.app.handle + ':' + job.stack.handle;
  entries.push({key: 'env.SERVO_COMMIT', value: job.build.commit.sha});
  entries.push({key: 'env.AWS_REGION', value: settings.awsRegion});
  entries.push({key: 'env.SERVO_REGION', value: settings.region});
  entries.push({key: 'env.PORT', value: '53840'});
  entries.push({key: 'env.NEW_RELIC_HIGH_SECURITY', value: 'true'});
  entries.push({key: 'env.NEW_RELIC_APP_NAME', value: handle});
  entries.forEach(function (entry) {
    if (entry.key.substr(0, 4) !== 'env.') return;
    script += 'echo "export ' + entry.key.substr(4) + '=\'' + entry.value + '\'" >> /home/app/.bashrc;';
    script += 'echo "export ' + entry.key.substr(4) + '=\'' + entry.value + '\'" >> /home/app/.profile;';
  });
  script += 'chown app:app /home/app/.bashrc;';
  script += 'chown app:app /home/app/.profile;';
  return script;
}