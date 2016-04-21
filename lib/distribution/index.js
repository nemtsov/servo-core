var amazonSvc = require('_/amazon'),
  settings = require('_/settings'),
  error = require('_/error'),
  route53 = amazonSvc.service('Route53'),
  logger = require('_/logger')('distribution'),
  async = require('async'),
  regionMap = require('_/settings/regions').servoToAwsMap,
  Distribution = require('./models/distribution'),
  Notification = require('./notification'),
  Origin = require('./models/origin');

exports.getDistributions = getDistributions;
exports.createDistribution = createDistribution;
exports.deleteDistribution = deleteDistribution;
exports.createOrigin = createOrigin;
exports.listOrigins = listOrigins;
exports.deleteOrigin = deleteOrigin;
exports.updateOrigin = updateOrigin;

function getDistributions(cb) {
  var distSuffix = 'dist.' + settings.org + '.' + settings.route53Domain,
    distributions = [],
    found = [],
    params = {
      HostedZoneId: settings.route53ZoneId,
      StartRecordName: distSuffix
    };
  route53.listResourceRecordSets(params).eachItem(function (err, item) {
    if (err) return cb(new error.AmazonError(err));
    if (!item) return cb(null, distributions);
    var regex = new RegExp('^((\\w|-)+)\\.' + distSuffix.replace(/\./g, '\\.'));
    if (regex.test(item.Name)) {
      if (found.indexOf(item.Name) !== -1) return;
      found.push(item.Name);
      distributions.push(new Distribution(regex.exec(item.Name)[1]))
    }
  });
}

function createDistribution(distribution, cb) {
  var distSuffix = '.dist.' + settings.org + '.' + settings.route53Domain,
    id = distribution.id,
    distRoot = id + distSuffix,
    permChanges = [],
    tempChanges = [],
    hostedZoneId = settings.route53ZoneId.substr(12);

  logger.info('creating distribution', distribution);

  async.auto({
    checkExisting: function (cb) {
      getDistributions(function (err, distributions) {
        if (err) return cb(err);
        var existing = false;
        distributions.forEach(function (dist) {
          if (dist.id === id) existing = true;
        });
        cb((existing) ? new error.ConflictError('distribution ' + id + ' already exists') : null);
      })
    },
    records: ['checkExisting', function (cb) {
      //Looping through regions to create regional records
      Object.keys(regionMap).forEach(function (region) {
        tempChanges.push({
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: region + '.origin.' + distRoot,
            Type: 'CNAME',
            SetIdentifier: id + '-primary',
            Weight: 1,
            TTL: 60,
            ResourceRecords: [{Value: 'temp'}]
          }
        });
        tempChanges.push({
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: region + '.fail.' + distRoot,
            Type: 'CNAME',
            SetIdentifier: id + '-primary',
            Weight: 1,
            TTL: 60,
            ResourceRecords: [{Value: 'temp'}]
          }
        });
        permChanges.push({
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: 'origin.' + distRoot,
            Type: 'CNAME',
            SetIdentifier: region,
            Region: regionMap[region],
            AliasTarget: {
              DNSName: region + '.origin.' + distRoot,
              EvaluateTargetHealth: true,
              HostedZoneId: hostedZoneId
            }
          }
        });
        permChanges.push({
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: 'fail.' + distRoot,
            Type: 'CNAME',
            SetIdentifier: region,
            Region: regionMap[region],
            AliasTarget: {
              DNSName: region + '.fail.' + distRoot,
              EvaluateTargetHealth: true,
              HostedZoneId: hostedZoneId
            }
          }
        });
      });
      //Top level records
      permChanges.push({
        Action: 'CREATE',
        ResourceRecordSet: {
          Name: id + distSuffix,
          Type: 'CNAME',
          SetIdentifier: id + '-primary',
          Failover: 'PRIMARY',
          AliasTarget: {
            DNSName: 'origin.' + distRoot,
            EvaluateTargetHealth: true,
            HostedZoneId: hostedZoneId
          }
        }
      });
      permChanges.push({
        Action: 'CREATE',
        ResourceRecordSet: {
          Name: id + distSuffix,
          Type: 'CNAME',
          SetIdentifier: id + '-secondary',
          Failover: 'SECONDARY',
          AliasTarget: {
            DNSName: 'fail.' + distRoot,
            EvaluateTargetHealth: true,
            HostedZoneId: hostedZoneId
          }
        }
      });
      route53.changeResourceRecordSets({
        HostedZoneId: settings.route53ZoneId,
        ChangeBatch: {
          Changes: tempChanges.concat(permChanges)
        }
      }, cb)
    }],
    cleanupTempRecords: ['records', function (cb) {
      tempChanges.forEach(function (change) {
        change.Action = 'DELETE';
      });
      route53.changeResourceRecordSets({
        HostedZoneId: settings.route53ZoneId,
        ChangeBatch: {
          Changes: tempChanges
        }
      }, cb)
    }],
    topic: ['records', Notification.createTopic.bind(null, {distribution: distribution.id})]
  }, cb)
}

function deleteDistribution(distributionId, cb) {
  var distSuffix = distributionId + '.dist.' + settings.org + '.' + settings.route53Domain;
  logger.info('deleting distribution ' + distributionId);
  async.auto({
    origins: listOrigins.bind(null, distributionId),
    existingOrigins: ['origins', function (cb, results) {
      (results.origins.length) ? cb(new error.NotEmptyError('all origins must be deleted')) : cb(null);
    }],
    records: ['existingOrigins', listDistributionRecords.bind(null, distributionId)],
    deletion: ['records', function (cb, results) {
      if (!results.records.length) return cb(new error.NotFoundError('distribution not found', distributionId));
      var params = {
        HostedZoneId: settings.route53ZoneId,
        ChangeBatch: {
          Changes: []
        }
      };
      results.records.forEach(function (record) {
        var change = {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: record.Name,
            Type: record.Type,
            SetIdentifier: record.SetIdentifier,
            AliasTarget: record.AliasTarget
          }
        };
        if (record.Failover) change.ResourceRecordSet.Failover = record.Failover;
        if (record.Region) change.ResourceRecordSet.Region = record.Region;
        params.ChangeBatch.Changes.push(change);
      });
      route53.changeResourceRecordSets(params, cb);
    }],
    delTopics:['deletion', Notification.deleteTopic.bind(null, {distribution: distributionId})]
  }, function (err) {
    (err) ? cb(err) : cb(null, new Distribution(distributionId));
  });
}

function createOrigin(origin, cb) {
  logger.info('creating distribution origin', origin);
  var distSuffix = '.' + origin.distributionId + '.dist.' + settings.org + '.' + settings.route53Domain,
    address = origin.region + '.' + ((origin.failover) ? 'fail' : 'origin') + distSuffix;
  if (origin.suspended) address = 'suspended.' + address;
  async.auto({
    checkExisting: function (cb) {
      listOrigins(origin.distributionId, function (err, origins) {
        if (err) return cb(new error.AmazonError(err));
        var exists = false;
        origins.forEach(function (existingOrigin) {
          if (existingOrigin.address === origin.address && existingOrigin.region === origin.region) exists = true;
        });
        (exists) ? cb(new error.ConflictError('origin already exists')) : cb(null);
      });
    },
    healthCheck: ['checkExisting', function (cb) {
      var params = {
        CallerReference: origin.address.substr(0, 50) + new Date().getTime(),
        HealthCheckConfig: {
          FullyQualifiedDomainName: origin.address,
          Type: origin.health.type,
          RequestInterval: 10,
          FailureThreshold: 3
        }
      };
      if (origin.health.port) params.HealthCheckConfig.Port = origin.health.port;
      if (origin.health.path) params.HealthCheckConfig.ResourcePath = origin.health.path;
      route53.createHealthCheck(params, cb)
    }],
    tagHealthCheck: ['healthCheck', function (cb, results) {
      route53.changeTagsForResource({
        ResourceType: 'healthcheck',
        ResourceId: results.healthCheck.HealthCheck.Id,
        AddTags: [
          {Key: 'Name', Value: origin.address},
          {Key: 'Associated Record', Value: address}
        ]
      }, cb)
    }],
    record: ['healthCheck', 'tagHealthCheck', function (cb, results) {
      route53.changeResourceRecordSets({
        HostedZoneId: settings.route53ZoneId,
        ChangeBatch: {
          Changes: [{
            Action: 'CREATE',
            ResourceRecordSet: {
              Name: address,
              Type: 'CNAME',
              SetIdentifier: origin.address,
              Weight: origin.weight,
              TTL: 60,
              ResourceRecords: [{Value: origin.address}],
              HealthCheckId: results.healthCheck.HealthCheck.Id
            }
          }]
        }
      }, cb)
    }]
  }, function (err) {
    (err) ? cb(err) : cb(null, origin);
  })
}

function listOrigins(distributionId, cb) {
  var distSuffix = distributionId + '.dist.' + settings.org + '.' + settings.route53Domain;
  async.auto({
    records: listDistributionRecords.bind(null, distributionId),
    originRecords: ['records', function (cb, results) {
      cb(null, results.records.filter(function (record) {
        return /^.+\.(origin|fail)\..+$/.test(record.Name)
      }));
    }],
    healthChecks: ['originRecords', function (cb, results) {
      async.map(results.originRecords, function (record, cb) {
        route53.getHealthCheck({HealthCheckId: record.HealthCheckId}, function (err, data) {
          //ignore error
          cb(null, data)
        });
      }, cb)
    }],
    healthCheckStatus: ['originRecords', function (cb, results) {
      var healthCheckMap = {};
      async.each(results.originRecords, function (record, cb) {
        var healthCheckId =  record.HealthCheckId;
        if (!healthCheckId) return cb(null);
        route53.getHealthCheckStatus({HealthCheckId: healthCheckId}, function (err, data) {
          if (err) return cb(err);
          healthCheckMap[healthCheckId] = data.HealthCheckObservations.map(function (observation) {
            return {
              sourceIpAddress: observation.IPAddress,
              time: new Date(observation.StatusReport.CheckedTime).getTime(),
              message: observation.StatusReport.Status,
              healthy: /^Success:/.test(observation.StatusReport.Status)
            };
          });
          cb(null);
        });
      }, function (err) {
        if (err) return cb(err);
        cb(null, healthCheckMap);
      })
    }],
    origins: ['healthChecks', 'healthCheckStatus', function (cb, results) {
      var origins = [],
        healthCheckMap = {};
      results.healthChecks.forEach(function (healthCheck) {
        healthCheckMap[healthCheck.HealthCheck.Id] = healthCheck;
      });
      results.originRecords.forEach(function (record) {
        var name = record.Name,
          suffix = distSuffix.replace(/\./g, '\\.'),
          healthCheck = healthCheckMap[record.HealthCheckId].HealthCheck,
          region = new RegExp('(\\w+)\.(origin|fail)\\.' + suffix).exec(name)[1],
          failover = (new RegExp('(origin|fail)\\.' + suffix).exec(name)[1] === 'fail'),
          suspended = new RegExp('suspended\\.(\\w+)\.(origin|fail)\\.' + suffix).test(name);
        origins.push(new Origin({
          region: region,
          weight: record.Weight,
          address: record.ResourceRecords[0].Value,
          suspended: suspended,
          failover: failover,
          health: {
            type: healthCheck.HealthCheckConfig.Type,
            port: healthCheck.HealthCheckConfig.Port,
            path: healthCheck.HealthCheckConfig.ResourcePath || null,
            id: record.HealthCheckId,
            status: results.healthCheckStatus[record.HealthCheckId] || null
          }
        }, distributionId))
      });
      cb(null, origins);
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.origins);
  });
}

function deleteOrigin(distributionId, originId, cb) {
  logger.info('deleting distribution origin', distributionId, originId);
  async.auto({
    existing: getOrigin.bind(null, distributionId, originId),
    deleteRecord: ['existing', function (cb, results) {
      var existing = results.existing,
        name = getRecordNameFromOrigin(existing);
      route53.changeResourceRecordSets({
        HostedZoneId: settings.route53ZoneId,
        ChangeBatch: {
          Changes: [{
            Action: 'DELETE',
            ResourceRecordSet: {
              Name: name,
              Type: 'CNAME',
              SetIdentifier: existing.address,
              Weight: existing.weight,
              TTL: 60,
              ResourceRecords: [{Value: existing.address}],
              HealthCheckId: existing.health.id
            }
          }]
        }
      }, cb);
    }],
    deleteHealthCheck: ['deleteRecord', function (cb, results) {
      route53.deleteHealthCheck({HealthCheckId: results.existing.health.id}, cb);
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.existing);
  })
}

function updateOrigin(distributionId, originId, weight, suspended, cb) {
  async.auto({
    origin: getOrigin.bind(null, distributionId, originId),
    update: ['origin', function (cb, results) {
      var weightChanged = (weight && weight !== results.origin.weight),
        suspendedChanged = (typeof suspended === 'boolean' && suspended !== results.origin.suspended);
      if (suspendedChanged) {
        changeOriginSuspension(results.origin, suspended, weight, cb);
      } else if (weightChanged) {
        changeOriginWeight(results.origin, weight, cb)
      } else {
        cb(new error.BadInputError('no change'));
      }
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.update);
  })
}

function changeOriginSuspension(origin, suspended, newWeight, cb) {
  var original = JSON.parse(JSON.stringify(origin));

  origin.suspended = suspended;
  if (newWeight) origin.weight = newWeight;

  route53.changeResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    ChangeBatch: {
      Changes: [{
        Action: 'DELETE',
        ResourceRecordSet: {
          Name: getRecordNameFromOrigin(original),
          Type: 'CNAME',
          SetIdentifier: original.address,
          Weight: original.weight,
          TTL: 60,
          ResourceRecords: [{Value: original.address}],
          HealthCheckId: original.health.id
        }
      },
      {
        Action: 'CREATE',
        ResourceRecordSet: {
          Name: getRecordNameFromOrigin(origin),
          Type: 'CNAME',
          SetIdentifier: origin.address,
          Weight: origin.weight,
          TTL: 60,
          ResourceRecords: [{Value: origin.address}],
          HealthCheckId: origin.health.id
        }
      }]
    }
  }, function (err) {
    (err) ? cb(err) : cb(null, origin);
  });
}

function changeOriginWeight(origin, weight, cb) {
  route53.changeResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    ChangeBatch: {
      Changes: [{
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: getRecordNameFromOrigin(origin),
          Type: 'CNAME',
          SetIdentifier: origin.address,
          Weight: weight,
          TTL: 60,
          ResourceRecords: [{Value: origin.address}],
          HealthCheckId: origin.health.id
        }
      }]
    }
  }, function (err) {
    if (err) return cb(err);
    origin.weight = weight;
    cb(null, origin);
  });
}

function listDistributionRecords(distributionId, cb) {
  var distSuffix = distributionId + '.dist.' + settings.org + '.' + settings.route53Domain;
  route53.listResourceRecordSets({
    HostedZoneId: settings.route53ZoneId,
    StartRecordName: distSuffix
  }, function (err, data) {
    if (err) return cb(err);
    var regex1 = new RegExp('^.+\\.' + distSuffix.replace(/\./g, '\\.')),
      regex2 = new RegExp('^' + distSuffix.replace(/\./g, '\\.'));
    cb(null, data.ResourceRecordSets.filter(function (record) {
      return (regex1.test(record.Name) || regex2.test(record.Name))
    }))
  })
}

function getOrigin(distributionId, originId, cb) {
  async.auto({
    origins: listOrigins.bind(null, distributionId),
    existing: ['origins', function (cb, results) {
      var existing = false;
      results.origins.forEach(function (origin) {
        if (origin.id === originId) existing = origin;
      });
      (existing) ? cb(null, existing) : cb(new error.NotFoundError('origin not found'));
    }]
  }, function (err, results) {
    (err) ? cb(err) : cb(null, results.existing);
  })
}

function getRecordNameFromOrigin(origin) {
  var type = (origin.failover) ? 'fail' : 'origin',
    name = origin.region + '.' + type + '.' + origin.distributionId + '.dist.' + settings.org +
      '.' + settings.route53Domain + '.';
  if (origin.suspended === true) name = 'suspended.' + name;
  return name;
}
