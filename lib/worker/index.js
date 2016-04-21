var db = require('_/db'),
  logger = require('_/logger')('worker'),
  ec2 = require('_/amazon').service('EC2'),
  newrelic = require('_/newrelic'),
  amazonSvc = require('_/amazon'),
  error = require('_/error'),
  moment = require('moment'),
  async = require('async');

function getNewRelicServer (context, cb) {
  var workerId = context.workerId;
  async.auto({
    credentials: function (done) {
      newrelic.getCredentials(context, done);
    },
    server: ['credentials', function (done, results) {
      newrelic.apiRequest('servers', results.credentials.apiKey, {'filter[name]': workerId}, function (err, result) {
        if (err) return done(err);
        var servers = result.servers;
        if (servers.length !== 1)
          return done(new error.ServoError('Wrong number of servers returned by new relic', JSON.stringify(servers)));
        done(null, servers[0]);
      });
    }]
  }, function (err, results) {
    if (err) return cb(err);
    cb(null, results.server);
  });
}

function getNewRelicLink (context, cb) {
  getNewRelicServer(context, function (err, server) {
    if (err) return cb(err);
    cb(null, "https://rpm.newrelic.com/accounts/" + server.account_id + "/servers/" + server.id);
  });
}

exports.getServerStatus = function (appId, stackId, workerId, cb) {
  async.auto({
    worker: function (done) {
      var query = {
        id: workerId,
        appId: appId,
        stackId: stackId
      };

      db.workers.findOne(query, done);
    },
    stack: function (done) {
      db.stacks.findById(stackId, done);
    },
    newrelic: ['worker', function (done, results) {
      var context = {
        appId: results.worker.appId,
        stackId: results.worker.stackId,
        deployId: results.worker.deployId,
        workerId: workerId
      };
      getNewRelicServer(context, done);
    }],
    elb: ['worker', 'stack', function (done, results) {
      var stack = results.stack,
        elb = amazonSvc.service('ELB');

      if (!stack || !stack.assets.active || !stack.assets.active.loadBalancerPublicName)
        return done();

      elb.describeInstanceHealth({
        LoadBalancerName: stack.assets.active.loadBalancerPublicName,
        Instances: [
          {
            InstanceId: workerId
          }]
      }, done);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    var newrelicStatus = results.newrelic,
      elbStatus = results.elb.InstanceStates &&
        results.elb.InstanceStates.length && results.elb.InstanceStates[0].State,
      serverStatus = {
        status: newrelicStatus.health_status,
        cpu: newrelicStatus.summary.cpu,
        diskIO: newrelicStatus.summary.disk_io,
        memory: newrelicStatus.summary.memory,
        fullestDisk: newrelicStatus.summary.fullest_disk,
        timestamp: moment(newrelicStatus.summary.last_reported_at).toDate().valueOf()
    };
    if (elbStatus)
      serverStatus['_health'] = elbStatus;
    return cb(null, serverStatus);
  });
}

exports.onWorkerCreated = function (event) {
  var context = event.context,
    workerId = context.workerId,
    worker = {
      appId: context.appId,
      stackId: context.stackId,
      deployId: context.deployId
    };

  if (!workerId) return logger.error('WorkerCreated missing workerId in context', event);
  async.auto({
    description: function (done) {
      ec2.describeInstances({InstanceIds: [workerId]}, done);
    },
    worker: ['description', function (done, results) {
      var instanceInfo;
      try {
        instanceInfo = results.description.Reservations[0].Instances[0];
      } catch (err) {
        return logger.error('error getting instance info', results.description);
      }
      worker.instanceType = instanceInfo.InstanceType;
      worker.launchTime = moment(instanceInfo.LaunchTime).valueOf();
      worker.privateIpAddress = instanceInfo.PrivateIpAddress;
      worker.publicIpAddress = instanceInfo.PublicIpAddress;
      worker.networkInterfaceIds = instanceInfo.NetworkInterfaces.map(function (NetworkInterface) {
        return {
          networkInterfaceId: NetworkInterface.NetworkInterfaceId,
          privateIpAddress: NetworkInterface.PrivateIpAddress
        };
      });
      db.workers.save(worker, done);
    }],
    updateId: ['worker', function (done, results) {
      db.workers.updateById(results.worker.id, {id: workerId}, done);
    }],
    insertNewRelicLink: ['updateId', function (done, results) {
      done();
      async.retry({times: 5, interval: 60*1000}, function (pass) {
        context.workerId = workerId;
        getNewRelicLink(context, pass);
      }, function (err, result) {
        if (err) return logger.error(err);
        db.workers.updateById(workerId, {newrelicLink: result}, function (err) {
          if (err) return logger.error(err);
        });
      });
    }],
    indexAppId: db.workers.ensureIndex.bind(db.workers, 'appId', {sparse: true}),
    indexStackId: db.workers.ensureIndex.bind(db.workers, 'stackId', {sparse: true}),
    indexDeployId: db.workers.ensureIndex.bind(db.workers, 'deployId', {sparse: true})
  }, function (err) {
    if (err) return logger.error(err);
    logger.info('Worker ' + workerId + ' created');
  });
};

exports.onWorkerDestroyed = function (event) {
  var workerId = event.context.workerId;

  if (!workerId)
    return logger.error('WorkerDestroyed missing workerId in context', event);

  async.auto({
    worker: db.workers.findOne.bind(db.workers, {id: workerId}),
    update: ['worker', function (done, results) {
      results.worker._destroyedAt = new Date().valueOf();
      results.worker._destroyed = true;
      db.workers.save(results.worker, done);
    }]
  }, function (err, results) {
    if (err) return logger.error(err);
    logger.info('Worker ' + results.worker.id + ' destoryed');
  });
};

module.exports = exports;
