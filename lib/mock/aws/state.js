module.exports = {
  Vpcs: [
    {
      VpcId: 'vpc-123456',
      State: 'available',
      Tags: [
        {Key: 'Name', Value: 'california:ocp'}
      ],
      InstanceTenancy: 'default',
      IsDefault: false,
      CidrBlock: '10.0.0.0/24',
      DhcpOptionsId: 'dopt-12345678'
    }
  ],
  Subnets: [
    {
      SubnetId: 'subnet-a1234567',
      State: 'available',
      MapPublicIpOnLaunch: true,
      CidrBlock: '',
      AvailabilityZone: 'us-west-1b',
      Tags: [
        {Key: 'Name', Value: 'california:ocp:shared1'}
      ]
    },
    {
      SubnetId: 'subnet-b1234567',
      State: 'available',
      MapPublicIpOnLaunch: true,
      CidrBlock: '',
      AvailabilityZone: 'us-west-1c',
      Tags: [
        {Key: 'Name', Value: 'california:ocp:shared2'}
      ]
    }
  ],
  Queues: [
    {
      QueueName: 'california_ocp',
      QueueUrl: 'https://sqs.aws.fake.com/servo_california_ocp'
    },
    {
      QueueName: 'california_ocp_builders',
      QueueUrl: 'https://sqs.aws.fake.com/servo_california_ocp_builders'
    },
    {
      QueueName: 'california_ocp_events',
      QueueUrl: 'https://sqs.aws.fake.com/servo_california_ocp_events'
    }
  ],
  Buckets: [
    {
      Name: 'servo-california-ocp',
      CreationDate: new Date().toISOString()
    },
    {
      Name: 'servo-oregon-ocp',
      CreationDate: new Date().toISOString()
    }
  ],
  Messages: [],
  SecurityGroups: [
    {
      GroupId: 'securityGroupId1',
      GroupName: 'SecurityGroup for Sample Addresses',
      IpPermissions: [{
        IpProtocol: 'tcp',
        FromPort: 1,
        ToPort: 1,
        IpRanges: [{CidrIp: '10.0.0.0/8'}]
      }]
    },
    {
      GroupId: 'securityGroupId2',
      GroupName: 'SecurityGroup for stack2',
      IpPermissions: [{
        IpProtocol: 'tcp',
        FromPort: 1,
        ToPort: 1,
        IpRanges: [{CidrIp: '10.0.0.0/8'}]
      }]
    },
    {
      GroupId: 'emptySGId',
      GroupName: 'Empty SG',
      IpPermissions: []
    }
  ],
  LoadBalancers: [],
  HostedZones: [
    {
      Id: '/hostedzone/1234567890',
      Name: 'example.com.'
    }
  ]
};
