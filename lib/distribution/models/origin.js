var regionMap = require('_/settings/regions').servoToAwsMap,
  error = require('_/error'),
  crypto = require('crypto');

module.exports = function Origin(origin, distributionId) {
  if (!regionMap[origin.region])
    throw new error.BadInputError('invalid region');
  if (typeof origin.weight !== 'number' || origin.weight > 255 || origin.weight < 0)
    throw new error.BadInputError('weight must be between 0-255');
  if (!origin.address && typeof origin.address !== 'string')
    throw new error.BadInputError('address must be a string');
  if (origin.suspended !== true) origin.suspended = false;
  if (origin.failover !== true) origin.failover = false;
  if (!origin.health) origin.health = {};
  if (!origin.health.type) origin.health.type = 'TCP';
  if (!origin.health.port) origin.health.port = (origin.health.type === 'HTTPS') ? 443 : 80;
  if (origin.health.port && typeof origin.health.port !== 'number')
    throw new error.BadInputError('health.port must be a number');
  if (origin.health.path && typeof origin.health.path !== 'string')
    throw new error.BadInputError('health.path must be a string');
  if (origin.health.type === 'HTTP' && !origin.health.path)
    throw new error.BadInputError('HTTP health must include path');
  if (origin.health.type === 'HTTPS' && !origin.health.path)
    throw new error.BadInputError('HTTPS health must include path');
  this.id = crypto.createHash('sha1').update(origin.region + '-' + origin.address).digest("hex").substr(0, 10);
  this.distributionId = distributionId;
  this.region = origin.region;
  this.weight = origin.weight;
  this.address = origin.address;
  this.suspended = origin.suspended;
  this.failover = origin.failover;
  this.health = origin.health;
};

/*
{
  id: 'virginia-foo-bar-com',
  distributionId: 'poseidon',
  region: 'virginia',
  weight: 1,
  suspended: false,
  failover: false
  address: 'foo.bar.com' | '10.1.2.3',
  health: {
    type: 'HTTP' | 'HTTPS' | 'TCP',
    path: '/_health',
    port: 80
  }
}
 */