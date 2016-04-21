var async = require('async'),
  amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  queueSvc = require('_/queue'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.instanceSecurityGroup ||
    job.stack.assets.active.instanceSecurityGroup) return cb();
  var ec2 = amazonSvc.service('EC2'),
    name = settings.baseHandle + ':' + job.app.handle + ':' + job.stack.handle + ':instances';
  ec2.createSecurityGroup({
    Description: name,
    GroupName: name,
    VpcId: settings.vpc.VpcId
  }, function (err, data) {
    if (err) return cb(err);
    logger.info('created instance security group', data.GroupId, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.instanceSecurityGroup': data.GroupId}, cb
    );
  });
};

exports.revert = function (job, cb) {
  var groupId = job.stack.assets.pending.instanceSecurityGroup;
  if (!groupId) return cb();
  queueSvc.enqueue(
    '_/platform/operations/instanceSecurityGroup',
    'deleteJob',
    {groupId: groupId, deployId: job.deploy.id},
    function (err) {
      if (err) return cb(err);
      logger.info('enqueue job to delete instance security group', groupId, job.deploy.id);
      db.stacks.updateById(
        job.stack.id, {'assets.pending.instanceSecurityGroup': null}, cb
      );
    }
  );
};

exports.destroy = function (job, cb) {
  var groupId = job.stack.assets.active.instanceSecurityGroup;
  if (!groupId) return cb();
  queueSvc.enqueue(
    '_/platform/operations/instanceSecurityGroup',
    'deleteJob',
    {groupId: groupId, deployId: (job.deploy) ? job.deploy.id : null, stackId: job.stackId},
    function (err) {
      if (err) return cb(err);
      logger.info('enqueue job to delete instance security group',
        groupId, (job.deploy) ? job.deploy.id : job.stackId);
      db.stacks.updateById(
        job.stack.id, {'assets.active.instanceSecurityGroup': null}, cb
      );
    }
  );
};

exports.deleteJob = function (data, cb) {
  var ec2 = amazonSvc.service('EC2'),
    groupId = data.groupId;
  ec2.deleteSecurityGroup({
    GroupId: groupId
  }, function (err) {
    if (err) return cb(err);
    logger.info('deleted instance security group', groupId, (data.deployId) ? data.deployId : data.stackId);
    cb();
  });
};
