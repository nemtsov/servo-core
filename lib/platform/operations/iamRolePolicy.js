var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.iamRolePolicy) return cb();
  var iam = amazonSvc.service('IAM'),
    roleName = job.stack.assets.pending.iamRole,
    policyName = 'servo-policy',
    org = settings.baseHandle.split(':')[0],
    logGroupPrefix = org + '/' + settings.region + '/' + job.app.handle + '/' + job.stack.handle,
    policy = {
      Version: '2012-10-17',
      Statement: []
    };
  policy.Statement.push({
    Effect: 'Allow',
    Action: ['s3:GetObject'],
    Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/build/' + job.build.id
  });
  policy.Statement.push({
    Effect: 'Allow',
    Action: ['s3:GetObject'],
    Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/config/' + job.deploy.id
  });
  policy.Statement.push({
    Effect: 'Allow',
    Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:DescribeLogStreams'],
    Resource: 'arn:aws:logs:*:*:*'
  });
  policy.Statement.push({
    Effect: 'Allow',
    Action: ['logs:PutLogEvents'],
    Resource: 'arn:aws:logs:*:*:' + 'log-group:' + logGroupPrefix + ':log-stream:*'
  });
  iam.putRolePolicy({
    RoleName: roleName,
    PolicyName: policyName,
    PolicyDocument: JSON.stringify(policy)
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.putRolePolicy', err));
    logger.info('created iam role policy', roleName, job.deploy.id);
    db.stacks.updateById(job.stack.id, {'assets.pending.iamRolePolicy': policyName}, cb);
  });
};

exports.revert = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    policyName = job.stack.assets.pending.iamRolePolicy,
    roleName = job.stack.assets.pending.iamRole;
  if (!policyName) return cb();
  iam.deleteRolePolicy({
    RoleName: roleName,
    PolicyName: policyName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.deleteRolePolicy', err));
    logger.info('deleted iam role policy', roleName, job.deploy.id);
    db.stacks.updateById(job.stack.id, {'assets.pending.iamRolePolicy': null}, cb);
  });
};

exports.destroy = function (job, cb) {
  var iam = amazonSvc.service('IAM'),
    policyName = job.stack.assets.active.iamRolePolicy,
    roleName = job.stack.assets.active.iamRole;
  if (!policyName) return cb();
  iam.deleteRolePolicy({
    RoleName: roleName,
    PolicyName: policyName
  }, function (err) {
    if (err) return cb(new error.AmazonError('iam.deleteRolePolicy', err));
    logger.info('deleted iam role policy', roleName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(job.stack.id, {'assets.active.iamRolePolicy': null}, cb);
  });
};
