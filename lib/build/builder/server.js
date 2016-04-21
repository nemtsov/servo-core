var AWS = require('aws-sdk'),
  async = require('async'),
  fs = require('fs'),
  sqs = new AWS.SQS(),
  s3 = new AWS.S3(),
  spawn = require('child_process').spawn,
  crypto = require('crypto'),
  queueUrl = process.env.QUEUE_URL,
  instanceId = fs.readFileSync('/var/lib/cloud/data/instance-id', {encoding: 'utf-8'}).replace(/[^\w-]/g, ''),
  status = {state: 'STANDBY', log: [], stdout: '', stderr: '', instanceId: instanceId},
  job, receiptHandle, statusInterval, key, md5, config;

if (!queueUrl) {
  console.error(new Date(), 'QUEUE_URL environment variable must be set');
  process.exit(1);
}

queueReceive();

function queueReceive() {
  sqs.receiveMessage({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20
  }, function (err, data) {
    if (err) {
      console.warn(new Date(), err);
      return queueReceive();
    }
    if (!data.Messages) return queueReceive();
    console.log(new Date(), 'received message ' + data.Messages[0].MessageId);
    startJob(data.Messages[0]);
  });
}

function startJob(message) {
  job = JSON.parse(message.Body);
  receiptHandle = message.ReceiptHandle;
  key = job.key;
  md5 = crypto.createHash('md5').update(key).digest('base64');
  status.buildId = job.buildId;
  log(instanceId + ' received job ' + receiptHandle);
  status.state = 'BUILDING';
  publishJobStatus();
  statusInterval = setInterval(publishJobStatus, 5000);
  async.auto({
    setShutdown: function (cb) {
      var shutdown = spawn('shutdown', ['-h', '+20']);
      cb();
    },
    download: ['setShutdown', downloadPreBuild],
    extract: ['download', function (cb) {
      var extract = spawn(
        'tar',
        ['-xf', 'prebuild', '--strip', '1'],
        {cwd: '/tmp/build'}
      );
      extract.on('close', function (code) {
        var message = 'tar extract exited with code ' + code;
        log(message);
        cb((code !== 0) ? new Error(message) : null);
      });
    }],
    removePrebuild: ['extract', fs.unlink.bind(fs, '/tmp/build/prebuild')],
    configure: function (cb) {
      if (!job.buildconfig) return cb();
      configure(cb);
    },
    commands: ['configure', 'removePrebuild', function (cb) {
      async.eachSeries(job.commands, executeCommand, cb);
    }],
    createArchive: ['commands', function (cb) {
      var archive = spawn(
        'tar', ['-cf', '/tmp/build.tar', '--directory=/tmp/build', '.']
      );
      archive.on('close', function (code) {
        var message = 'tar archive exited with code ' + code;
        log(message);
        cb((code !== 0) ? new Error(message) : null);
      });
    }],
    upload: ['createArchive', uploadArchive]
  }, function (err) {
    if (err) {
      log(err.name + ' ' + err.message);
      console.warn(new Date(), err);
    }
    status.state = (err) ? 'FAILED' : 'COMPLETE';
    log('deleting job ' + receiptHandle);
    publishJobStatus(function () {
      clearInterval(statusInterval);
      sqs.deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      }, function (err) {
        if (err) console.warn(new Date(), 'error deleting message', err);
        else console.log(new Date(), 'deleted message', receiptHandle);
      });
    });
    console.log(new Date(), status);
  });
}

function configure(cb) {
  s3.getObject({
    Bucket: job.bucket,
    Key: job.buildconfig,
    SSECustomerAlgorithm: 'AES256',
    SSECustomerKey: key,
    SSECustomerKeyMD5: md5
  }, function (err, data) {
    if (err) return cb(err);
    try {
      config = JSON.parse(data.Body);
    } catch (err) {
      return cb(err);
    }
    if (config.docker && config.docker.auth) configureDocker(cb);
    else cb();
  })
}

function configureDocker(cb) {
  var body = {},
    registry = config.docker.auth.registry,
    user = config.docker.auth.user,
    password = config.docker.auth.password;
  body[registry] = {
    auth: new Buffer(user + ':' + password).toString('base64'),
    email: 'builder@example.com'
  };
  fs.writeFile('/root/.dockercfg', JSON.stringify(body, null, 2), cb)
}

function publishJobStatus(cb) {
  status.timestamp = new Date().getTime();
  async.series([
    sqs.changeMessageVisibility.bind(sqs, {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: 30
    }),
    function (cb) {
      s3.putObject({
        Bucket: job.bucket,
        Key: job.statusKey,
        Body: JSON.stringify(status),
        SSECustomerAlgorithm: 'AES256',
        SSECustomerKey: key,
        SSECustomerKeyMD5: md5
      }, cb);
    }
  ], function (err) {
    if (err) console.warn(new Date(), 'status error', err);
    console.log(new Date(), 'status published ' + status.state);
    if (cb) cb();
  })
}

function downloadPreBuild(cb) {
  fs.mkdirSync('/tmp/build');
  var stream = fs.createWriteStream(
    '/tmp/build/prebuild',
    {flags: 'w', encoding: null}
  );
  s3.getObject({
    Bucket: job.bucket,
    Key: job.prebuildKey,
    SSECustomerAlgorithm: 'AES256',
    SSECustomerKey: key,
    SSECustomerKeyMD5: md5
  }).on('httpData', function(chunk) {
    stream.write(chunk);
  }).on('complete', function() {
    stream.end();
    log('downloaded prebuild');
    cb();
  }).on('error', function(err) {
    stream.end();
    log('failed to download prebuild');
    cb(err);
  }).send();
}

function executeCommand(command, cb) {
  console.log(new Date(), 'executing "' + command + '"');
  log('executing "' + command + '"');
  var cmdArray = command.split(' '),
    cmd = cmdArray.shift(),
    env = JSON.parse(JSON.stringify(process.env)),
    execution;
  env.HOME = '/root';
  env.PATH += ':/usr/local/bin';
  execution = spawn(cmd, cmdArray, {cwd: '/tmp/build', env: env});
  execution.on('error', function (err) {
    var message = '"' + command + '" produced error ' + err;
    log(message);
    cb(new Error(message));
  });
  execution.stdout.on('data', function (data) {
    status.stdout += data.toString();
  });
  execution.stderr.on('data', function (data) {
    status.stderr += data.toString();
  });
  execution.on('close', function (code) {
    var message = '"' + command + '" exited with code ' + code;
    log(message);
    cb((code !== 0) ? new Error(message) : null);
  });
}

function uploadArchive(cb) {
  var stat = fs.statSync('/tmp/build.tar'),
    size = stat.size,
    cfg = {
      Bucket: job.bucket,
      Key: job.postbuildKey,
      ContentLength: size,
      SSECustomerAlgorithm: 'AES256',
      SSECustomerKey: key,
      SSECustomerKeyMD5: md5
    },
    buffer = null,
    startTime = new Date(),
    partNum = 0,
    partSize = 1024 * 1024 * 5,
    numPartsLeft = null,
    maxUploadTries = 3,
    multiPartParams = {
      Bucket: cfg.Bucket,
      Key: cfg.Key,
      SSECustomerAlgorithm: cfg.SSECustomerAlgorithm,
      SSECustomerKey: cfg.SSECustomerKey,
      SSECustomerKeyMD5: cfg.SSECustomerKeyMD5
    },
    multipartMap = {
      Parts: []
    };

  fs.readFile('/tmp/build.tar', function (err, data) {
    buffer = data;
    numPartsLeft = Math.ceil(buffer.length / partSize);
    createMultipart();
  });


  function createMultipart() {
    s3.createMultipartUpload(multiPartParams, function (err, multipart) {
      if (err) return cb(err);
      log('created multipart upload ' + cfg.Key);
      for (var rangeStart = 0; rangeStart < buffer.length; rangeStart += partSize) {
        partNum++;
        var end = Math.min(rangeStart + partSize, buffer.length),
          partParams = {
            Body: buffer.slice(rangeStart, end),
            Bucket: cfg.Bucket,
            Key: cfg.Key,
            PartNumber: String(partNum),
            UploadId: multipart.UploadId,
            SSECustomerAlgorithm: cfg.SSECustomerAlgorithm,
            SSECustomerKey: cfg.SSECustomerKey,
            SSECustomerKeyMD5: cfg.SSECustomerKeyMD5
          };
        uploadPart(s3, multipart, partParams);
      }
    });
  }

  function completeMultipartUpload(s3, doneParams) {
    s3.completeMultipartUpload(doneParams, function (err) {
      buffer = null;
      if (!err) {
        var delta = (new Date() - startTime) / 1000;
        log('completed multipart upload in ' + delta + ' seconds');
      }
      cb(err);
    });
  }

  function uploadPart(s3, multipart, partParams, tryNum) {
    tryNum = tryNum || 1;
    s3.uploadPart(partParams, function (multiErr, mData) {
      if (multiErr) {
        if (tryNum < maxUploadTries) {
          uploadPart(s3, multipart, partParams, tryNum + 1);
        } else {
          log('failed uploading part: #' + partParams.PartNumber);
        }
        return;
      }
      multipartMap.Parts[this.request.params.PartNumber - 1] = {
        ETag: mData.ETag,
        PartNumber: Number(this.request.params.PartNumber)
      };

      if (--numPartsLeft > 0) return; // complete only when all parts uploaded
      var doneParams = {
        Bucket: cfg.Bucket,
        Key: cfg.Key,
        MultipartUpload: multipartMap,
        UploadId: multipart.UploadId
      };
      completeMultipartUpload(s3, doneParams);
    });
  }
}

function log(message) {
  status.log.push(new Date().toISOString() + ' ' + message);
}
