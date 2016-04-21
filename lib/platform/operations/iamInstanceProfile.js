var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.iamInstanceProfile) return cb();
  var iam = amazonSvc.service('IAM'),
    roleName = job.stack.assets.pending.iamRole,
    profileName = roleName;
  iam.createInstanceProfile({
    InstanceProfileName: profileName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.createInstanceProfile', err));
    iam.addRoleToInstanceProfile({
      InstanceProfileName: profileName,
      RoleName: roleName
    }, function (err) {
      if (err) return cb(new error.AmazonError('iam.addRoleToInstanceProfile', err));
      logger.info('created iam instance profile', profileName, job.deploy.id);
      db.stacks.updateById(job.stack.id, {'assets.pending.iamInstanceProfile': profileName}, cb);
    });
  });
};

exports.revert = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    profileName = job.stack.assets.pending.iamInstanceProfile,
    roleName = job.stack.assets.pending.iamRole;
  if (!profileName) return cb();
  iam.removeRoleFromInstanceProfile({
    RoleName: roleName,
    InstanceProfileName: profileName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.removeRoleFromInstanceProfile', err));
    iam.deleteInstanceProfile({
      InstanceProfileName: profileName
    }, function (err) {
      if (err) return cb(new error.AmazonError('iam.deleteInstanceProfile', err));
      logger.info('deleted iam instance profile', profileName, job.deploy.id);
      db.stacks.updateById(job.stack.id, {'assets.pending.iamInstanceProfile': null}, cb);
    });
  });
};

exports.destroy = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    profileName = job.stack.assets.active.iamInstanceProfile,
    roleName = job.stack.assets.active.iamRole;
  if (!profileName) return cb();
  iam.removeRoleFromInstanceProfile({
    RoleName: roleName,
    InstanceProfileName: profileName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.removeRoleFromInstanceProfile', err));
    iam.deleteInstanceProfile({
      InstanceProfileName: profileName
    }, function (err) {
      if (err) return cb(new error.AmazonError('iam.deleteInstanceProfile', err));
      logger.info('deleted iam instance profile', profileName, (job.deploy) ? job.deploy.id : job.stackId);
      db.stacks.updateById(job.stack.id, {'assets.active.iamInstanceProfile': null}, cb);
    });
  });
};
