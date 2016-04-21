var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  var ec2 = amazonSvc.service('EC2'),
    imageId = job.stack.assets.pending.imageId,
    imageName = null;
  if (imageId) return cb();

  job.deploy.config.forEach(function (entry) {
    if (entry.key === 'ImageName') imageName = entry.value;
  });

  ec2.describeImages({
    Filters: [
      {Name: 'name', Values: [imageName]}
    ] //TODO limit to results from our account
  }, function (err, data) {
    if (err) return cb(new error.AmazonError('ec2.describeImages', err));
    if (!data.Images.length) return cb(new Error('image not found'));
    if (data.Images.length > 1) return cb(new Error('more than one image found'));
    imageId = data.Images[0].ImageId;
    logger.info('found imageId', imageName, imageId, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.imageId': imageId}, cb
    );
  });
};

exports.revert = function (job, cb) {
  cb();
};

exports.destroy = function (job, cb) {
  cb();
};