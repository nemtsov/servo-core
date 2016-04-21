var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  db = require('_/db'),
  async = require('async'),
  error = require('_/error'),
  logger = require('_/logger')('platform/operations');

exports.setup = function (job, cb) {
  if (job.stack.assets.pending.launchConfiguration) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    script = ['#!/bin/bash'],
    launchConfigName = settings.baseHandle.replace(/:/g, '_') + '_' +
      job.app.handle + '_' + job.stack.handle + '_' + job.deploy.id,
    instanceSecurityGroup = job.stack.assets.pending.instanceSecurityGroup ||
      job.stack.assets.active.instanceSecurityGroup,
    imageId = job.stack.assets.pending.imageId,
    instanceType = null,
    params,
    logGroupPrefix = settings.org + '/' + settings.region + '/' + job.app.handle + '/' + job.stack.handle,
    logStreamPrefix = job.deploy.id,
    newRelicLicenseKey;

  job.deploy.config.forEach(function (entry) {
    if (entry.key === 'InstanceType') instanceType = entry.value;
    if (entry.key === 'NewRelicLicenseKey') newRelicLicenseKey = entry.value;
  });

  async.auto({
    script: function (cb) {
      script.push('exec &>/var/log/startup.log');
      script.push('AZ=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`');
      script.push("REGION=$(echo $AZ | awk '{print substr($0, 0, length($0)-1)}')");
      script.push('sed -i "s/region.*/region = ${REGION}/" /etc/awslogs/awscli.conf');
      script.push('logGroup=' + logGroupPrefix + '');
      script.push('logStream=' + logStreamPrefix + '/' + '`cat /var/lib/cloud/data/instance-id`');
      script.push('printf "[general]\n' +
      'state_file = /var/lib/awslogs/agent-state\n\n' +
      '[/var/log/app.log]\n' +
      'log_group_name = $logGroup\n' +
      'log_stream_name = app/$logStream\n' +
      'file = /var/log/app.log\n\n' +
      '[dockerlogs]\n' +
      'log_group_name = $logGroup\n' +
      'log_stream_name = app/$logStream\n' +
      'file = /var/lib/docker/containers/*/*-json.log\n\n' +
      '[/var/log/messages]\n' +
      'log_group_name = $logGroup\n' +
      'log_stream_name = system/$logStream\n' +
      'file = /var/log/messages\n\n' +
      '[/var/log/startup.log]\n' +
      'log_group_name = $logGroup\n' +
      'log_stream_name = system/$logStream\n' +
      'file = /var/log/startup.log" > /etc/awslogs/awslogs.conf');
      script.push('service awslogs restart');
      script.push('hostname `cat /var/lib/cloud/data/instance-id`');
      script.push('cd /home/app');
      if ( newRelicLicenseKey ) {
        script.push('echo "export NEW_RELIC_LICENSE_KEY=\'' + newRelicLicenseKey + '\'" >> /home/app/.profile');
        script.push('echo "export NEW_RELIC_LICENSE_KEY=\'' + newRelicLicenseKey + '\'" >> /home/app/.bashrc');
        script.push('nrsysmond-config --set license_key=\'' + newRelicLicenseKey + '\'');
        script.push('/etc/init.d/newrelic-sysmond start');
      }
      script.push('aws s3 cp s3://' + settings.s3Bucket + '/build/' + job.build.id + ' build');
      script.push('tar -xf build --strip 1;');
      script.push('if [ $? -ne 0 ]; then shutdown -P now; fi');
      script.push('aws s3api get-object --bucket ' + settings.s3Bucket +
      ' --key config/' + job.deploy.id +
      ' --sse-customer-algorithm AES256 --sse-customer-key ' + job.envKey +
      ' --sse-customer-key-md5 ' + job.envKeyMd5 + ' config.servo');
      script.push('bash config.servo; rm -f config.servo');
      script.push('chown -R app:app /home/app');
      script.push('exec &>/var/log/app.log');
      if (job.properties.appScript) script = script.concat(job.properties.appScript);
      //TODO start logger

      params = {
        LaunchConfigurationName: launchConfigName,
        ImageId: imageId,
        InstanceMonitoring: {
          Enabled: true
        },
        InstanceType: instanceType,
        SecurityGroups: [instanceSecurityGroup, settings.defaultSecurityGroup],
        UserData: new Buffer(script.join('\n')).toString('base64'),
        IamInstanceProfile: job.stack.assets.pending.iamInstanceProfile,
        KeyName: settings.baseHandle
      };

      if (job.app.handle === 'servo-core') { //TODO find better way to do this
        params.SecurityGroups.push(); //TODO add servo-core security group when discovered
        params.IamInstanceProfile = 'servo-core';
      }

      function create(cb) {
        autoscaling.createLaunchConfiguration(params, function (err) {
          if (!err) return cb();
          setTimeout(cb.bind({}, err), 6000);
        });
      }
      async.retry(10, create, function (err) {
        delete job.envKey;
        delete job.envKeyMd5;
        if (err) return cb(new error.AmazonError('autoscaling.createLaunchConfiguration', err));
        logger.info('created launch configuration', launchConfigName, job.deploy.id);
        db.stacks.updateById(
          job.stack.id, {'assets.pending.launchConfiguration': launchConfigName}, cb
        );
      });
    }
  }, cb);
};

exports.revert = function (job, cb) {
  delete job.envKey;
  delete job.envKeyMd5;
  if (!job.stack.assets.pending.launchConfiguration) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    launchConfigName = job.stack.assets.pending.launchConfiguration;
  autoscaling.deleteLaunchConfiguration({
    LaunchConfigurationName: launchConfigName
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.deleteLaunchConfiguration', err));
    logger.info('deleted launch configuration', launchConfigName, job.deploy.id);
    db.stacks.updateById(
      job.stack.id, {'assets.pending.launchConfiguration': null}, cb
    );
  });
};

exports.destroy = function (job, cb) {
  if (!job.stack.assets.active.launchConfiguration) return cb();
  var autoscaling = amazonSvc.service('AutoScaling'),
    launchConfigName = job.stack.assets.active.launchConfiguration;
  autoscaling.deleteLaunchConfiguration({
    LaunchConfigurationName: launchConfigName
  }, function (err) {
    if (err) return cb(new error.AmazonError('autoscaling.deleteLaunchConfiguration', err));
    logger.info('deleted launch configuration', launchConfigName, (job.deploy) ? job.deploy.id : job.stackId);
    db.stacks.updateById(
      job.stack.id, {'assets.active.launchConfiguration': null}, cb
    );
  });
};