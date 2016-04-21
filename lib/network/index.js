import async from 'async';
import ipParser from 'ip';
import amazonSvc from '_/amazon';
import Logger from '_/logger';
import error from '_/error';
import db from '_/db';
import {getByName as getAddressBookByName} from '_/admin/lib/addressBook/';

const logger = Logger('network'),
  ec2 = amazonSvc.service('EC2');

function getDiff(obj1, obj2, cb) {
  let diff = {};
  obj2.forEach((rule) => {
    if ( !obj1.has(rule) ) {
      let values = rule.split(':'),
        cidr = values.splice(0, 1)[0],
        entry = values.join(':');

      if (diff[entry]) {
        diff[entry].push({CidrIp: cidr});
      } else {
        diff[entry] = [{CidrIp: cidr}];
      }
    }
  });
  cb(null, diff);
}

function normalizeCIDR(cidr) {
  let normalizedIP = null;
  try {
    normalizedIP = ipParser.cidr(cidr);
  } catch (err) {
    return logger.warn(new error.BadInputError('Malformed CIDR', cidr));
  }
  let mask = cidr.split('/')[1];
  return normalizedIP + '/' + mask;
}

function compareSGRules(ruleType, stackId, securityGroupId, cb) {
  const ipList = (ruleType === 'NetworkIngress') ? 'IpPermissions' : 'IpPermissionsEgress';
  async.auto({
    configs: (done) => {
      db.configs.find({
        level: 'stack',
        context: stackId,
        key: ruleType
      }, (err, results) => {
        if (err) return done(err);
        let configs = results[0] ? results[0].value : [];
        if (configs && !Array.isArray(configs)) {
          configs = configs.split(',');
          configs = configs.map(function (config) {
            if (!config.match(/cidr/i))
              config = 'CIDR:' + config;
            return config;
          });
        }
        done(null, configs);
      });
    },
    inConfig: ['configs', (done, results) => {
      let configs = results.configs || [];
      let ruleSet = new Set();

      function addToRuleSet(rule) {
        if (rule.length === 4)
          return ruleSet.add(rule.join(':'));
        ruleSet.add(rule.concat(['tcp', 80, 80]).join(':'));
        ruleSet.add(rule.concat(['tcp', 443, 443]).join(':'));
      }

      async.each(configs, (config, next) => {
        let name = '';
        let cidr = '';
        let rule = config.split(':');
        let type = rule.splice(0, 1)[0];

        if (type.match(/cidr/i)) {
          let normalizedCIDR = normalizeCIDR(rule[0]);
          if (normalizedCIDR) {
            rule[0] = normalizedCIDR;
            addToRuleSet(rule)
          }
          next();
        } else if (type.match(/book/i)) {
          name = rule.splice(0, 1)[0];
          getAddressBookByName(name, (err, addressBook) => {
            if (err) return logger.error(err);
            if (addressBook) {
              addressBook.addresses.forEach((address) => {
                let normalizedCIDR = normalizeCIDR(address);
                if (normalizedCIDR)
                  addToRuleSet([normalizedCIDR].concat(rule));
              });
            }
            next();
          });
        } else {
          logger.warn('Malformed config entry!', config);
          next();
        }
      }, (err) => {
        done(null, ruleSet);
      });
    }],
    inUse: (done) => {
      ec2.describeSecurityGroups({
        GroupIds: [securityGroupId]
      }, (err, results) => {
        if (err) return done(err);
        let inUse = results.SecurityGroups[0][ipList];
        let ruleSet = new Set();
        if (Array.isArray(inUse)) {
          inUse.forEach((IpPermission) => {
            let protocol = IpPermission.IpProtocol;
            let fromPort = IpPermission.FromPort || '-1'; // -1 means all port ranges
            let toPort = IpPermission.ToPort || '-1';

            IpPermission.IpRanges.forEach((IpRange) => {
              let entry = [IpRange.CidrIp, protocol, fromPort, toPort].join(':');
              ruleSet.add(entry);
            });
          });
        }
        done(null, ruleSet);
      });
    },
    authorize: ['inConfig', 'inUse', (done, results) => {
      let inConfigRules = results.inConfig;
      let  inUseRules = results.inUse;
      getDiff(inUseRules, inConfigRules, done);
    }],
    revoke: ['inConfig', 'inUse', (done, results) => {
      let inConfigRules = results.inConfig;
      let  inUseRules = results.inUse;
      getDiff(inConfigRules, inUseRules, done);
    }]
  }, cb);
}

export function updateSecurityGroup (isIngress, stackId, cb) {
  let ruleType;
  let authorizeSecurityGroup;
  let revokeSecurityGroup;
  let sgType;

  if (isIngress) {
    ruleType = 'NetworkIngress';
    authorizeSecurityGroup = ec2.authorizeSecurityGroupIngress.bind(ec2);
    revokeSecurityGroup = ec2.revokeSecurityGroupIngress.bind(ec2);
    sgType = 'loadBalancerSecurityGroup';
  } else {
    ruleType = 'NetworkEgress';
    authorizeSecurityGroup = ec2.authorizeSecurityGroupEgress.bind(ec2);
    revokeSecurityGroup = ec2.revokeSecurityGroupEgress.bind(ec2);
    sgType = 'instanceSecurityGroup';
  }

  async.auto({
    securityGroupId: (done) => {
      db.stacks.findById(stackId, (err, stack) => {
        if (err) return done(err);
        let securityGroupId = stack.assets.active[sgType];
        if (!securityGroupId) return done(new error.ServoError('Can not find security group for stack', stackId));
        done(null, stack.assets.active[sgType]);
      });
    },
    diff: ['securityGroupId', (done, results) => {
      compareSGRules(ruleType, stackId, results.securityGroupId, done);
    }],
    authorize: ['diff', (done, results) => {
      const IpPermissions = Object.keys(results.diff.authorize).map((key) => {
        let info = key.split(':');
        return {
          IpProtocol: info[0],
          FromPort: info[1],
          ToPort: info[2],
          IpRanges: results.diff.authorize[key]
        };
      });

      if (!IpPermissions.length) return done();
      logger.info(ruleType, 'rules will be added to stack', stackId, JSON.stringify(IpPermissions));
      authorizeSecurityGroup({
        GroupId: results.securityGroupId,
        IpPermissions: IpPermissions
      }, done);
    }],
    revoke: ['diff', (done, results) => {
      const IpPermissions = Object.keys(results.diff.revoke).map((key) => {
        let info = key.split(':');
        return {
          IpProtocol: info[0],
          FromPort: info[1],
          ToPort: info[2],
          IpRanges: results.diff.revoke[key]
        };
      });
      if (!IpPermissions.length) return done();
      logger.info(ruleType, 'rules will be removed from stack', stackId, JSON.stringify(IpPermissions));
      revokeSecurityGroup({
        GroupId: results.securityGroupId,
        IpPermissions: IpPermissions
      }, done);
    }]
  }, cb);
};

export function onConfigChange (event) {
  let stackId = event.context.stackId;
  let message = event.message;
  let isIngress = null;

  if (event.message.match('Config NetworkIngress')) {
    isIngress = true;
  } else if (event.message.match('Config NetworkEgress')) {
    isIngress = false;
  } else {
    return null;
  }

  updateSecurityGroup(isIngress, stackId, (err) => {
    if (err) return logger.error('Can not properly set network rules for stack ' + stackId, err);
  });
}

export function onDeployComplete (event) {
  let stackId = event.context.stackId;
  let isIngress = true;

  async.auto({
    ingressConfig: (done) => {
      updateSecurityGroup(isIngress, stackId, done);
    },
    egressConfig: (done) => {
      updateSecurityGroup(!isIngress, stackId, done);
    }
  }, (err) => {
    if (err) return logger.error('Can not properly set network rules for stack ' + stackId, err);
  });
};
