var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.active.hostnameInternal ||
    job.stack.assets.pending.hostnameInternal ||
    job.stack.assets.active.hostnamePublic ||
    job.stack.assets.pending.hostnamePublic) return cb();
  var route53 = amazonSvc.service('Route53'),
    internalLbDns = job.stack.assets.pending.loadBalancerInternalDns ||
      job.stack.assets.active.loadBalancerInternalDns,
    publicLbDns = job.stack.assets.pending.loadBalancerPublicDns ||
      job.stack.assets.active.loadBalancerPublicDns,
    baseArray = settings.baseHandle.split(':'),
    internalRecord, publicRecord;
  baseArray.push(job.app.handle, job.stack.handle);
  baseArray.reverse();
  internalRecord = 'int.' + baseArray.join('.') + '.' + settings.route53Domain;
  publicRecord = 'pub.' + baseArray.join('.') + '.' + settings.route53Domain;
  route53.changeResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: internalRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: internalLbDns + '.'}],
            TTL: 30
          }
        },
        {
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: publicRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: publicLbDns + '.'}],
            TTL: 30
          }
        }
      ]
    }
  }, function (err) {
    if (err) return cb(new error.AmazonError('route53.changeResourceRecordSets', err));
    logger.info('created route53 record', internalRecord, job.deploy.id);
    logger.info('created route53 record', publicRecord, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {
        'assets.pending.hostnameInternal': internalRecord,
        'assets.pending.hostnamePublic': publicRecord
      }, cb
    );
  });
};

exports.revert = function (job, cb) {
  if (!job.stack.assets.pending.hostnameInternal ||
    !job.stack.assets.pending.hostnamePublic) return cb();
  var route53 = amazonSvc.service('Route53'),
    internalRecord = job.stack.assets.pending.hostnameInternal,
    publicRecord = job.stack.assets.pending.hostnamePublic;
  route53.changeResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: internalRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: job.stack.assets.pending.loadBalancerInternalDns + '.'}],
            TTL: 30
          }
        },
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: publicRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: job.stack.assets.pending.loadBalancerPublicDns + '.'}],
            TTL: 30
          }
        }
      ]
    }
  }, function (err) {
    if (err) return cb(new error.AmazonError('route53.changeResourceRecordSets', err));
    logger.info('deleted route53 record', internalRecord, job.deploy.id);
    logger.info('deleted route53 record', publicRecord, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {
        'assets.pending.hostnameInternal': null,
        'assets.pending.hostnamePublic': null
      }, cb
    );
  });
};

exports.destroy = function (job, cb) {
  if (!job.stack.assets.active.hostnameInternal ||
    !job.stack.assets.active.hostnamePublic) return cb();
  var route53 = amazonSvc.service('Route53'),
    internalRecord = job.stack.assets.active.hostnameInternal,
    publicRecord = job.stack.assets.active.hostnamePublic;
  route53.changeResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: internalRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: job.stack.assets.active.loadBalancerInternalDns + '.'}],
            TTL: 30
          }
        },
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: publicRecord + '.',
            Type: 'CNAME',
            ResourceRecords: [{Value: job.stack.assets.active.loadBalancerPublicDns + '.'}],
            TTL: 30
          }
        }
      ]
    }
  }, function (err) {
    if (err) return cb(new error.AmazonError('route53.changeResourceRecordSets', err));
    logger.info('deleted route53 record', internalRecord, (job.deploy) ? job.deploy.id : job.stackId);
    logger.info('deleted route53 record', publicRecord, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {
        'assets.active.hostnameInternal': null,
        'assets.active.hostnamePublic': null
      }, cb
    );
  });
};
