var settings = module.exports = {},
  regions = require('./regions');

settings.mockDb = (process.env.MOCK_DB === 'true');
settings.mockAws = (process.env.MOCK_AWS === 'true');
settings.noListen = (process.env.NO_LISTEN === 'true');
settings.builders = parseInt(process.env.BUILDERS) || process.env.BUILDERS;
settings.debug = (process.env.DEBUG === 'true');
settings.port = process.env.PORT || 3000;
settings.mongoUri = process.env.MONGO_URI || 'mongodb://localhost/servo2?auto_reconnect=true';
settings.baseHandle = process.env.BASE_HANDLE;
settings.baseUrl = process.env.BASE_URL;
settings.org = settings.baseHandle.split(':')[0];
settings.region = settings.baseHandle.split(':')[1];
settings.awsRegion = regions.servoToAwsMap[settings.region];
settings.accountId = process.env.AWS_ACCOUNT_ID;
settings.production = (process.env.NODE_ENV === 'production');
settings.test = (process.env.NODE_ENV === 'test');
settings.key = process.env.KEY;
settings.sharedSubnets = [null, null];
settings.availabilityZones = [null, null];
settings.route53Domain = process.env.ROUTE53_DOMAIN;
settings.route53ZoneId = null;
settings.npmServer = process.env.NPM_SERVER;
