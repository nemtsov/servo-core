import {BadInputError} from '_/error';
import amazonSvc from '_/amazon';
import {DistributionSNS} from './model';
import Logger from '_/logger';

const logger = Logger('distribution/notification')
const sns = amazonSvc.service('SNS');


export function createTopic({distribution}, cb) {
  try {
    const distributionSNS = new DistributionSNS(distribution);
    logger.debug(`Creating topic ${distributionSNS.topicName}`);

    sns.createTopic({
      Name: distributionSNS.topicName
    }, (err, data) => {
      if (err) return cb(err);
      cb(null, data);
    });
  } catch (e) {
    return cb(e);
  }
}

export function addSubscription({distribution}, email, cb) {
  // Lazy checking for email
  if (!email || email.length === 0 || email.indexOf('@') < 0) return cb(new BadInputError('Input a valid email'));

  try {
    const distributionSNS = new DistributionSNS(distribution);
    logger.debug(`Adding ${email} to ${distributionSNS.topicName}`);

    sns.subscribe({
      Protocol: 'email',
      TopicArn: distributionSNS.topicArn,
      Endpoint: email
    }, (err, data) => {
      if (err) return cb(err);
      cb(null, data.SubscriptionArn);
    });
  } catch (e) {
    return cb(e);
  }
}

export function getTopic({distribution}, cb) {
  try {
    const distributionSNS = new DistributionSNS(distribution);
    logger.debug(`Getting topic ${distributionSNS.topicName}`);

    sns.listSubscriptionsByTopic({
      TopicArn: distributionSNS.topicArn
    }, (err, data) => {
      if (err) return cb(err);
      const subscriptions = data.Subscriptions.map(sub => sub.Endpoint);
      cb(null, subscriptions);
    });
  } catch (e) {
    return cb(e);
  }
}

export function deleteTopic({distribution}, cb) {
  try {
    const distributionSNS = new DistributionSNS(distribution);
    logger.debug(`Deleting topic ${distributionSNS.topicName}`);

    sns.deleteTopic({
      TopicArn: distributionSNS.topicArn
    }, (err, data) => {
      if (err) return cb(err);
      cb(null);
    });
  } catch (e) {
    return cb(e);
  }
}
