var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.iamRole) return cb();
  var iam = amazonSvc.service('IAM'),
    assumePolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {Service: 'ec2.amazonaws.com'},
          Action: 'sts:AssumeRole'
        }
      ]
    }),
    roleName = settings.baseHandle.replace(/:/g, '_') + '_' +
      job.app.handle + '_' + job.stack.handle;
  roleName = roleName.substr(0, 53) + '_' + job.deploy.id;
  iam.createRole({
    AssumeRolePolicyDocument: assumePolicy,
    RoleName: roleName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.createRole', err));
    logger.info('created iam role', roleName, job.deploy.id);
    db.stacks.updateById(job.stack.id, {'assets.pending.iamRole': roleName}, cb);
  });
};

exports.revert = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    roleName = job.stack.assets.pending.iamRole;
  if (!roleName) return cb();
  iam.deleteRole({
    RoleName: roleName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.createRole', err));
    logger.info('deleted iam role', roleName, job.deploy.id);
    db.stacks.updateById(job.stack.id, {'assets.pending.iamRole': null}, cb);
  });
};

exports.destroy = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    roleName = job.stack.assets.active.iamRole;
  if (!roleName) return cb();
  iam.deleteRole({
    RoleName: roleName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.createRole', err));
    logger.info('deleted iam role', roleName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(job.stack.id, {'assets.active.iamRole': null}, cb);
  });
};