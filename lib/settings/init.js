var settings = require('./index'),
  amazonSvc = require('_/amazon'),
  error = require('_/error'),
  async = require('async'),
  logger = require('_/logger')('settings/init');

module.exports = function (cb) {
  //TODO get aws account id, save as settings.awsAccountId
  //TODO get events sns topic
  //TODO confirm EC2 ssh key pair available
  if (!settings.key) {
    logger.error('Need an encryption key!!!!!');
    throw new error.ServoError('Please set KEY environment variable!')
  }
  async.auto({
    vpc: getVpc,
    sqsQueueUrl: getSqsQueue,
    builderQueueUrl: getBuilderQueue,
    eventsQueueUrl: getEventsQueue,
    s3Bucket: getS3Bucket,
    subnets: ['vpc', getSubnets],
    defaultSecurityGroup: ['vpc', getDefaultSecurityGroup],
    route53ZoneId: getZoneId
  }, function (err) {
    if (!err) logger.info('settings initiated successfully');
    cb(err);
  });
};

function getVpc(cb) {
  var ec2 = amazonSvc.service('EC2'),
    filters = [{Name: 'tag:Name', Values: [settings.baseHandle]}];
  ec2.describeVpcs({Filters: filters}, function (err, data) {
    if (err) return cb(new error.AmazonError('ec2.describeVpcs', err));
    if (!data.Vpcs[0]) return cb(new Error('vpc not found'));
    settings.vpc = data.Vpcs[0];
    logger.debug('located vpc', settings.vpc.VpcId);
    cb();
  });
}

function getDefaultSecurityGroup(cb) {
  var ec2 = amazonSvc.service('EC2'),
    filters = [
      {Name: 'vpc-id', Values: [settings.vpc.VpcId]},
      {Name: 'group-name', Values: ['default']}
    ];
  ec2.describeSecurityGroups({Filters: filters}, function (err, data) {
    if (err) return cb(new error.AmazonError('ec2.describeSecurityGroups', err));
    if (!data.SecurityGroups[0]) return cb(new Error('default security group not found'));
    settings.defaultSecurityGroup = data.SecurityGroups[0].GroupId;
    cb();
  });
}

function getSqsQueue(cb) {
  var sqs = amazonSvc.service('SQS'),
    queueName = settings.baseHandle.replace(/:/g, '_');
  sqs.getQueueUrl({QueueName: queueName}, function (err, data) {
    if (err) return cb(new error.AmazonError('sqs.getQueueUrl', err));
    settings.sqsQueueUrl = data.QueueUrl;
    logger.debug('located sqsQueueUrl', data.QueueUrl);
    cb();
  });
}

function getBuilderQueue(cb) {
  if (settings.builders === 'false') return cb();
  var sqs = amazonSvc.service('SQS'),
    queueName = settings.baseHandle.replace(/:/g, '_') + '_builders';
  sqs.getQueueUrl({QueueName: queueName}, function (err, data) {
    if (err) return cb(new error.AmazonError('sqs.getQueueUrl', err));
    settings.builderQueueUrl = data.QueueUrl;
    logger.debug('located builderQueueUrl', data.QueueUrl);
    sqs.getQueueAttributes({
      QueueUrl: data.QueueUrl,
      AttributeNames: ['QueueArn']
    }, function (err, data) {
      if (err) return cb(new error.AmazonError('sqs.getQueueAttributes', err));
      settings.builderQueueArn = data.Attributes.QueueArn;
      logger.debug('located builderQueueArn', data.Attributes.QueueArn);
      cb();
    })
  });
}

function getEventsQueue(cb) {
  var sqs = amazonSvc.service('SQS'),
    queueName = settings.baseHandle.replace(/:/g, '_') + '_events';
  sqs.getQueueUrl({QueueName: queueName}, function (err, data) {
    if (err) return cb(new error.AmazonError('sqs.getQueueUrl', err));
    settings.eventsQueueUrl = data.QueueUrl;
    logger.debug('located eventsQueueUrl', data.QueueUrl);
    sqs.getQueueAttributes({
      QueueUrl: data.QueueUrl,
      AttributeNames: ['QueueArn']
    }, function (err, data) {
      if (err) return cb(new error.AmazonError('sqs.getQueueAttributes', err));
      settings.eventsQueueArn = data.Attributes.QueueArn;
      logger.debug('located eventsQueueArn', data.Attributes.QueueArn);
      cb();
    })
  });
}

function getS3Bucket(cb) {
  var s3 = amazonSvc.service('S3'),
    bucketName = 'servo-' + settings.baseHandle.replace(/:/g, '-'), //TODO: fix this
    located = false;
  s3.listBuckets(function (err, data) {
    if (err) return cb(new error.AmazonError('s3.listBuckets', err));
    data.Buckets.forEach(function (bucket) {
      if (bucket.Name === bucketName) located = true;
    });
    if (!located) return cb(new error.NotFoundError('bucket not found'));
    settings.s3Bucket = bucketName;
    logger.debug('located s3Bucket', bucketName);
    cb();
  });
}

function getSubnets(cb) {
  var ec2 = amazonSvc.service('EC2');
  async.parallel([
    function (cb) {
      var filters = [{Name: 'tag:Name', Values: [settings.baseHandle + ':shared1']}];
      ec2.describeSubnets({Filters: filters}, function (err, data) {
        if (err) return cb(new error.AmazonError('ec2.describeSubnets', err));
        if (!data.Subnets[0]) return cb(new error.NotFoundError('subnet shared1 not found'));
        settings.sharedSubnets[0] = data.Subnets[0].SubnetId;
        settings.availabilityZones[0] = data.Subnets[0].AvailabilityZone;
        cb();
      });
    },
    function (cb) {
      var filters = [{Name: 'tag:Name', Values: [settings.baseHandle + ':shared2']}];
      ec2.describeSubnets({Filters: filters}, function (err, data) {
        if (err) return cb(new error.AmazonError('ec2.describeSubnets', err));
        if (!data.Subnets[0]) return cb(new error.NotFoundError('subnet shared2 not found'));
        settings.sharedSubnets[1] = data.Subnets[0].SubnetId;
        settings.availabilityZones[1] = data.Subnets[0].AvailabilityZone;
        cb();
      });
    }
  ], cb);
}

function getZoneId(cb) {
  var route53 = amazonSvc.service('Route53');
  route53.listHostedZones({}, function (err, data) {
    if (err) return cb(new error.AmazonError('route53.listHostedZones', err));
    async.detect(data.HostedZones, function (zone, cb) {
      cb((zone.Name === settings.route53Domain + '.'));
    }, function (zone) {
      if (!zone) return cb(
        new error.NotFoundError('route53 zone ' + settings.route53Domain + ' not found')
      );
      logger.debug('located route53 zone', zone.Id);
      settings.route53ZoneId = zone.Id;
      cb();
    });
  });
}
