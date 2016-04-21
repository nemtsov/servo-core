import {BadInputError} from '_/error';
import {org, awsRegion, accountId} from '_/settings';

export class DistributionSNS {
  constructor(distribution) {
    if (!distribution) throw new BadInputError('Distribution must be specified');
    this.distribution = distribution;
    const topicName = `${org}_distribution_${distribution}`;
    this.topicName = topicName;
    //TODO: Change AWSRegion is us-west-1 because it is unused anywhere else
    this.topicArn = `arn:aws:sns:us-west-1:${accountId}:${topicName}`
  }
}
