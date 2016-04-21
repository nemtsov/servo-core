var AWS = require('aws-sdk'),
  settings = require('_/settings');
AWS.config.update({region: settings.awsRegion});

function noop() {}

module.exports = {
  config: {
    update: noop
  },
  EC2: require('./services/ec2'),
  SQS: require('./services/sqs'),
  SNS: require('./services/sns'),
  SES: require('./services/ses'),
  IAM: require('./services/iam'),
  ELB: require('./services/elb'),
  S3: require('./services/s3'),
  Route53: require('./services/route53'),
  CloudWatch: require('./services/cloudwatch'),
  AutoScaling: require('./services/autoscaling'),
  CloudWatchLogs: require('./services/cloudwatchlogs'),
  Lambda: require('./services/lambda')
};

exports.list = [
  'ec2.describeVpcs', //Easy
  'ec2.describeSubnets', //Easy
  'ec2.describeSecurityGroups', //Easy
  'ec2.describeImages', //Easy
  'ec2.describeInstances',
  'ec2.runInstances', //Only used for AMI
  'ec2.createImage', //Only used for AMI
  'ec2.terminateInstances',
  'ec2.modifyInstanceAttribute',
  'sns.listTopics', //Easy
  'ses.sendEmail', //Easy
  'sqs.getQueueUrl', //Easy
  'sqs.receiveMessage',
  'sqs.sendMessage',
  'sqs.deleteMessage',
  'asg.createLaunchConfiguration',
  'asg.createAutoScalingGroup',
  'asg.putScalingPolicy',
  'asg.putNotificationConfiguration',
  'asg.describeAutoScalingGroups',
  'asg.deleteAutoScalingGroup',
  'asg.deleteLaunchConfiguration',
  'asg.updateAutoScalingGroup',
  'cloudwatch.putMetricAlarm',
  'cloudwatch.deleteAlarms',
  'iam.createRole',
  'iam.putRolePolicy',
  'iam.createInstanceProfile',
  'iam.addRoleToInstanceProfile',
  'iam.removeRoleFromInstanceProfile',
  'iam.deleteInstanceProfile',
  'iam.deleteRolePolicy',
  'iam.deleteRole',
  'elb.registerInstancesWithLoadBalancer',
  'elb.deregisterInstancesFromLoadBalancer',
  'elb.createLoadBalancer',
  'elb.configureHealthCheck',
  'elb.modifyLoadBalancerAttributes',
  'elb.deleteLoadBalancer',
  'elb.describeLoadBalancers',
  'elb.describeInstanceHealth',
  'elb.describeLoadBalancerAttributes',
  'route53.changeResourceRecordSets',
  'route53.listResourceRecordSets',
  'route53.listHostedZones',
  's3.listObjects',
  's3.completeMultipartUpload',
  's3.uploadPart',
  's3.createMultipartUpload'
];