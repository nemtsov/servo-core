var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  async = require('async'),
  configSvc = require('_/config'),
  logger = require('_/logger')('build/builders'),
  colonName = settings.baseHandle + ':builders',
  underscoreName = settings.baseHandle.replace(/:/g, '_') + '_' + 'builders',
  priceMap = {};

exports.ensure = function (cb) {
  if (settings.builders === '0') return cb();
  async.auto({
    instanceType: bestInstanceType,
    currentLaunchConfig: getLaunchConfig,
    currentAutoScalingGroup: getAutoScalingGroup,
    currentIamRole: getIamRole,
    ensureIamRole: ['currentIamRole', function (cb, results) {
      if (results.currentIamRole) return cb();
      createIamRole(cb);
    }],
    ensureLaunchConfig: ['ensureIamRole', 'instanceType', 'currentLaunchConfig',
      function (cb, results) {
        if (results.currentLaunchConfig) return cb();
        logger.info('creating builder launch config ' + results.instanceType);
        createLaunchConfig(underscoreName, results.instanceType, cb);
      }
    ],
    ensureAutoScalingGroup: ['currentAutoScalingGroup', 'ensureLaunchConfig', function (cb, results) {
      if (results.currentAutoScalingGroup) return cb();
      logger.info('creating builder auto scaling group');
      createAutoScalingGroup(cb);
    }],
    ensureInstanceType: ['instanceType', 'currentLaunchConfig', function (cb, results) {
      if (!results.currentLaunchConfig) return cb();
      var currentInstanceType = results.currentLaunchConfig.InstanceType;
      if (currentInstanceType === results.instanceType) return cb();
      if ((priceMap[results.instanceType] + 0.01) < priceMap[currentInstanceType]) return cb();
      replaceLaunchConfig(results.instanceType, cb);
    }]
  }, function (err) {
    if (cb) cb(err);
  });
};

function bestInstanceType(cb) {
  var ec2 = amazonSvc.service('EC2'),
    instanceTypes = [
      'c4.large',
      'c4.xlarge',
      'c3.large',
      'c3.xlarge',
      'r3.large',
      'r3.xlarge',
      'm3.large',
      'm4.large',
      'm4.xlarge'
    ];
  ec2.describeSpotPriceHistory({
    InstanceTypes: instanceTypes,
    ProductDescriptions: ['Linux/UNIX (Amazon VPC)'],
    StartTime: new Date(),
    EndTime: new Date(),
    Filters: [
      {
        Name: 'availability-zone',
        Values: [
          settings.availabilityZones[0],
          settings.availabilityZones[1]
        ]
      }
    ]
  }, function (err, data) {
    if (err) return cb(err);
    var lowest = 100,
      lowestType = null;
    data.SpotPriceHistory.forEach(function (price) {
      var currentPrice = priceMap[price.InstanceType] || 0;
      if (price.SpotPrice > currentPrice)
        priceMap[price.InstanceType] = price.SpotPrice;
    });
    Object.keys(priceMap).forEach(function (type) {
      if (priceMap[type] < lowest) {
        lowest = priceMap[type];
        lowestType = type;
      }
    });
    logger.debug('lowest price option for builder pool is ' + lowestType);
    cb(null, lowestType);
  });
}

function getLaunchConfig(cb) {
  var autoscaling = amazonSvc.service('AutoScaling');
  autoscaling.describeLaunchConfigurations({
    LaunchConfigurationNames: [underscoreName]
  }, function (err, data) {
    cb(err || null, (data) ? data.LaunchConfigurations[0] : null);
  });
}

function getAutoScalingGroup(cb) {
  var autoscaling = amazonSvc.service('AutoScaling');
  autoscaling.describeAutoScalingGroups({
    AutoScalingGroupNames: [underscoreName]
  }, function (err, data) {
    cb(err || null, (data) ? data.AutoScalingGroups[0] : null);
  });
}

function getIamRole(cb) {
  var iam = amazonSvc.service('IAM');
  iam.getRole({RoleName: underscoreName}, function (err, data) {
    if (err && err.name === 'NoSuchEntity') err = null;
    cb(err || null, (data) ? data.Role : null);
  });
}

function createIamRole(cb) {
  logger.info('creating builder iam role');
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
    policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject'],
          Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/prebuild/*'
        },
        {
          Effect: 'Allow',
          Action: ['s3:PutObject'],
          Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/postbuild/*'
        },
        {
          Effect: 'Allow',
          Action: ['s3:PutObject'],
          Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/buildstatus/*'
        },
        {
          Effect: 'Allow',
          Action: ['s3:GetObject'],
          Resource: 'arn:aws:s3:::' + settings.s3Bucket + '/buildconfig/*'
        },
        {
          Effect: 'Allow',
          Action: ['sqs:ChangeMessageVisibility', 'sqs:ReceiveMessage', 'sqs:DeleteMessage'],
          Resource: settings.builderQueueArn
        }
      ]
    });
  async.series([
    iam.createRole.bind(iam, {
      AssumeRolePolicyDocument: assumePolicy,
      RoleName: underscoreName
    }),
    iam.createInstanceProfile.bind(iam, {
      InstanceProfileName: underscoreName
    }),
    iam.addRoleToInstanceProfile.bind(iam, {
      InstanceProfileName: underscoreName,
      RoleName: underscoreName
    }),
    iam.putRolePolicy.bind(iam, {
      RoleName: underscoreName,
      PolicyName: 'servo-builders-policy',
      PolicyDocument: policy
    }),
    function (cb) {
      setTimeout(cb, 5000);
    }
  ], cb);
}

function createLaunchConfig(launchConfigName, instanceType, cb) {
  var ec2 = amazonSvc.service('EC2'),
    autoscaling = amazonSvc.service('AutoScaling'),
    builderScript = [
      '#!/bin/bash',
      'exec > >(tee /var/log/system/startup.log) 2>&1',
      'export PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/root/bin',
      'cd /root',
      'source /root/.bash_profile',
      'aws s3 cp s3://' + settings.s3Bucket + '/prebuild/builder builder',
      'npm install -g npm@latest',
      'tar -xf builder --strip 1'
    ],
    launchConfigParams = {
      SpotPrice: '0.05', //TODO make max spot price a setting
      LaunchConfigurationName: launchConfigName,
      ImageId: null,
      InstanceMonitoring: {
        Enabled: true
      },
      InstanceType: instanceType,
      SecurityGroups: [settings.defaultSecurityGroup],
      IamInstanceProfile: underscoreName,
      KeyName: settings.baseHandle
    };
  if (settings.npmServer) builderScript.push('echo "registry=' + settings.npmServer + '" > /root/.npmrc');
  builderScript = builderScript.concat([
    'AWS_REGION=' + settings.awsRegion +
    ' QUEUE_URL=' + settings.builderQueueUrl +
    ' node server.js',
    'shutdown -h +20'
  ]);
  launchConfigParams.UserData = new Buffer(builderScript.join('\n')).toString('base64');
  async.auto({
    config: configSvc.listResolved.bind(configSvc, null, null),
    image: ['config', function (cb, results) {
      var imageName = null;
      results.config.forEach(function (entry) {
        if (entry.key === 'ImageName') imageName = entry.value;
      });
      ec2.describeImages({
        Filters: [
          {Name: 'name', Values: [imageName]}
        ] //TODO limit to results from our account
      }, function (err, data) {
        if (err) return cb(err);
        if (!data.Images.length) return cb(new Error('image not found'));
        if (data.Images.length > 1) return cb(new Error('more than one image found'));
        launchConfigParams.ImageId = data.Images[0].ImageId;
        cb();
      });
    }],
    securityGroup: function (cb) {
      ec2.createSecurityGroup({
        Description: colonName,
        GroupName: colonName,
        VpcId: settings.vpc.VpcId
      }, function (err) {
        if (err && err.name === 'InvalidGroup.Duplicate') err = null;
        if (err) return cb(err);
        ec2.describeSecurityGroups({
          Filters: [
            {Name: 'vpc-id', Values: [settings.vpc.VpcId]},
            {Name: 'group-name', Values: [colonName]}
          ]
        }, function (err, data) {
          if (err) return cb(err);
          launchConfigParams.SecurityGroups.push(data.SecurityGroups[0].GroupId);
          cb();
        });
      });
    },
    asg: [
      'image',
      'securityGroup',
      autoscaling.createLaunchConfiguration.bind(autoscaling, launchConfigParams)
    ]
  }, cb);
}

function createAutoScalingGroup(cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    size = settings.builders || 2;
  autoscaling.createAutoScalingGroup({
    AutoScalingGroupName: underscoreName,
    MinSize: size,
    MaxSize:  size,
    DesiredCapacity: size,
    LaunchConfigurationName: underscoreName,
    VPCZoneIdentifier: [settings.sharedSubnets[0], settings.sharedSubnets[1]].join(','),
    TerminationPolicies: ['ClosestToNextInstanceHour'],
    Tags: [
      {
        Key: 'Name',
        Value: colonName,
        PropagateAtLaunch: true
      }
    ]
  }, cb);
}

function replaceLaunchConfig(instanceType, cb) {
  var autoscaling = amazonSvc.service('AutoScaling'),
    tempName = underscoreName + '_temp';
  logger.info('updating builder pool to use ' + instanceType);
  async.auto({
    createTemp: createLaunchConfig.bind({}, tempName, instanceType),
    moveToTemp: ['createTemp', changeActiveLaunchConfig.bind({}, tempName)],
    deleteExisting: ['moveToTemp', autoscaling.deleteLaunchConfiguration.bind(
      autoscaling,
      {LaunchConfigurationName: underscoreName}
    )],
    createNew: ['deleteExisting', createLaunchConfig.bind({}, underscoreName, instanceType)],
    moveToNew: ['createNew', changeActiveLaunchConfig.bind({}, underscoreName)],
    deleteTemp: ['moveToNew', autoscaling.deleteLaunchConfiguration.bind(
      autoscaling,
      {LaunchConfigurationName: tempName}
    )]
  }, cb);
}

function changeActiveLaunchConfig(launchConfigName, cb) {
  var autoscaling = amazonSvc.service('AutoScaling');
  autoscaling.updateAutoScalingGroup({
    AutoScalingGroupName: underscoreName,
    LaunchConfigurationName: launchConfigName
  }, cb);
}