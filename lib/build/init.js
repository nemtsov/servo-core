var settings = require('_/settings'),
  builders = require('./builders'),
  worker = require('./worker'),
  spawn = require('child_process').spawn,
  error = require('_/error'),
  async = require('async'),
  amazonSvc = require('_/amazon'),
  fs = require('fs');

module.exports = function (cb) {
  if (settings.builders === 'false' || settings.builders === '0') return cb();
  setInterval(builders.ensure, randomInterval());
  async.parallel([
    uploadBuilderApp,
    builders.ensure.bind(builders)
  ], cb);
  setInterval(worker.checkStatus.bind(worker), 5000);
};

function randomInterval() {
  var min = 5,
    max = 15,
    minutes = Math.floor(Math.random() * (max - min + 1) + min);
  return minutes * 60 * 1000;
}

function uploadBuilderApp(cb) {
  var builderArchive = __dirname + '/builder.tar',
    archive;
  try {
    fs.unlinkSync(builderArchive);
  } catch (e) {}
  archive = spawn(
      'tar', ['-cf', builderArchive, '--directory=' + __dirname + '/builder', '.']
    );
  archive.on('close', function (code) {
    if (code !== 0) return cb(new error.ServoError('unable to archive builder'));
    putBundlerArchive(builderArchive, cb);
  });
}

function putBundlerArchive(file, cb) {
  fs.readFile(file, function (err, data) {
    if (err) return cb(err);
    var s3 = amazonSvc.service('S3');
    s3.putObject({
      Bucket: settings.s3Bucket,
      Key: 'prebuild/builder',
      Body: data,
      ContentLength: fs.statSync(file).size
    }, cb);
  });
}
