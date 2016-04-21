var async = require('async'),
  options = {memStore: true, searchInArray: true},
  Db = require('tingodb')(options).Db,
  db = require('./index').db = new Db('servo2', {}),
  mocks;

exports.init = function (cb) {
  async.each(Object.keys(mocks), function (collectionName, cb) {
    var collection = db.collection(collectionName);
    collection.insert(mocks[collectionName], cb);
  }, cb);
};

exports.cleanUp = function (cb) {
  async.each(Object.keys(mocks), function (collectionName, cb) {
    var collection = db.collection(collectionName);
    collection.remove({}, cb);
  }, cb);
};

mocks = {
  apps: [
    {
      id: 'a1',
      name: 'Sample App',
      handle: 'sample-app',
      source: 'somegithub.com/sample/sample',
      summary: {},
      _createdAt: 1424659530929,
      _updatedAt: 1424659530929
    },
    {
      id: 'a2',
      name: 'Test app',
      handle: 'test-app',
      source: 'somegithub.com/sample/test',
      summary: {},
      _createdAt: 1424659531929,
      _updatedAt: 1424659531929
    },
    {
      id: 'a3',
      name: 'Magic Pickle',
      handle: 'magic-pickle',
      source: 'somegithub.com/sample/MagicPickle',
      summary: {},
      _destroyed: true,
      _createdAt: 1424658530929,
      _updatedAt: 1424658530929
    },
    {
      id: 'a4',
      name: 'App Test',
      handle: 'app-test',
      source: 'somegithub.com/sample/app-test',
      summary: {},
      _createdAt: 1424659532929,
      _updatedAt: 1424659532929
    },
    {
      id: 'a5',
      name: 'Teemo is OP',
      handle: 'teemo-is-op',
      source: 'somegithub.com/sample/teemo',
      summary: {},
      _createdAt: 1424659530919,
      _updatedAt: 1424659530919
    },
    {
      id: 'a7',
      name: 'Another One',
      handle: 'another-one',
      source: 'somegithub.com/sample/another-one',
      summary: {},
      _createdAt: 1424659530919
    }
  ],
  stacks: [
    {
      id: 's11',
      appId: 'a1',
      name: 'Feature Test 42',
      handle: 'feature-test-42',
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 's12',
      appId: 'a1',
      name: 'Cold Fusion Experiment',
      handle: 'cold-fusion-experiment',
      _destroyed: true,
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 's13',
      appId: 'a1',
      name: 'Beta',
      handle: 'beta',
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 's21',
      appId: 'a2',
      name: 'Production',
      handle: 'production',
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 's51',
      appId: 'a5',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 's61',
      appId: 'a6',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {}, pending: {}}
    },
    {
      id: 'networkStack1',
      appId: 'a1',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {loadBalancerSecurityGroup: 'securityGroupId1'}, pending: {}}
    },
    {
      id: 'networkStack2',
      appId: 'a1',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {loadBalancerSecurityGroup: 'securityGroupId1'}, pending: {}}
    },
    {
      id: 'networkStack3',
      appId: 'a1',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {loadBalancerSecurityGroup: 'securityGroupId1'}, pending: {}}
    },
    {
      id: 'networkStack4',
      appId: 'a1',
      name: 'Staging',
      handle: 'staging',
      summary: {},
      platform: null,
      assets: {active: {loadBalancerSecurityGroup: 'emptySGId'}, pending: {}}
    }
  ],
  deploys: [
    {
      id: 'd1',
      stackId: 's11',
      appId: 'a1',
      buildId: 'b1',
      config: [],
      state: 'COMPLETE',
      stateReason: 'finished deploy',
      _createdAt: 1425874156652
    },
    {
      id: 'd2',
      stackId: 's11',
      appId: 'a1',
      buildId: 'b1',
      config: [],
      state: 'FAILED',
      stateReason: 'error creating workers: quota exceeded',
      _createdAt: 1425853126652
    }
  ],
  configs: [
    {
      id: 'config1',
      level: 'global',
      context: null,
      key: 'env.foo',
      value: 'bar',
      secret: false,
      encrypted: false
    },
    {
      id: 'config2',
      level: 'app',
      context: 'a1',
      key: 'env.airShieldCode',
      value: 'supersecretcodethatnooneknows',
      secret: false,
      encrypted: false
    },
    {
      id: 'config3',
      level: 'global',
      context: null,
      key: 'ImageName',
      value: 'servo2-2015.06.01',
      secret: false,
      encrypted: false
    },
    {
      id: 'config4',
      level: 'global',
      context: null,
      key: 'InstanceType',
      value: 't2.small',
      secret: false,
      encrypted: false
    },
    {
      id: 'config5',
      level: 'global',
      context: null,
      key: 'MinWorkers',
      value: '1',
      secret: false,
      encrypted: false
    },
    {
      id: 'config6',
      level: 'global',
      context: null,
      key: 'MaxWorkers',
      value: '4',
      secret: false,
      encrypted: false
    },
    {
      id: 'config7',
      level: 'global',
      context: null,
      key: 'ScaleUpThreshold',
      value: '50',
      secret: false,
      encrypted: false
    },
    {
      id: 'config8',
      level: 'global',
      context: null,
      key: 'ScaleUpDuration',
      value: '1',
      secret: false,
      encrypted: false
    },
    {
      id: 'config9',
      level: 'global',
      context: null,
      key: 'ScaleDownThreshold',
      value: '20',
      secret: false,
      encrypted: false
    },
    {
      id: 'config10',
      level: 'global',
      context: null,
      key: 'ScaleDownDuration',
      value: '5',
      secret: false,
      encrypted: false
    },
    {
      id: 'networkConfig1',
      level: 'stack',
      context: 'networkStack1',
      key: 'NetworkIngress',
      value: ['CIDR:10.0.0.0/8', 'Book:Sample Addresses', 'Book:Sample Other Addresses'],
      secret: false,
      encrypted: false
    },
    {
      id: 'networkConfig2',
      level: 'stack',
      context: 'networkStack2',
      key: 'NetworkIngress',
      value: ['Book:Sample Addresses:tcp:1:1'],
      secret: false,
      encrypted: false
    },
    {
      id: 'networkConfig3',
      level: 'stack',
      context: 'networkStack3',
      key: 'NetworkIngress',
      value: ['Book:Sample Addresses:tcp:1:1', 'Block:Sample Other Addresses'],
      secret: false,
      encrypted: false
    },
    {
      id: 'networkConfig4',
      level: 'stack',
      context: 'networkStack4',
      key: 'NetworkIngress',
      value: ['Book:Sample Addresses:tcp:1:1', 'CIDR:10.0.0.0/8:tcp:1:1'],
      secret: false,
      encrypted: false
    }
  ],
  builds: [
    {
      id: 'b1',
      manifest: {
        platform: 'nodejs'
      },
      commit: {
        sha: "somerandomsha1",
        commit: {message: "config: trying to build this"}
      },
      source: "somegithub.com/sample/sample",
      state: 'COMPLETE',
      output: {
        log: [
          "received job",
          "shutdown scheduled for 20 minutes",
          "downloaded prebuild",
          "tar extract exited with code 0",
          "executing \"yum install -y docker\"",
          "\"yum install -y docker\" exited with code 0",
          "executing \"service docker start\"",
          "\"service docker start\" exited with code 0",
          "executing \"docker build -t app .\"",
          "\"docker build -t app .\" exited with code 0",
          "executing \"rm -rf /tmp/build/*\"",
          "\"rm -rf /tmp/build/*\" exited with code 0",
          "executing \"docker save -o docker.image app\"",
          "\"docker save -o docker.image app\" exited with code 0",
          "tar archive exited with code 0",
          "created multipart upload postbuild/3b4d909f9d",
          "completed multipart upload in 8.224 seconds"
        ],
        stderr: "",
        stdout: "this is the stdout"

      }
    },
    {
      id: 'b2',
      manifest: {
        platform: 'nodejs'
      },
      commit: {
        sha: "somerandomsha2",
        commit: {message: "added readme, because im a good github citizen\n"}
      },
      source: "somegithub.com/sample/sample",
      state: 'COMPLETE',
      output: {
        log: [
          "received job",
          "shutdown scheduled for 20 minutes",
          "downloaded prebuild",
          "tar extract exited with code 0",
          "executing \"yum install -y docker\"",
          "\"yum install -y docker\" exited with code 0",
          "executing \"service docker start\"",
          "\"service docker start\" exited with code 0",
          "executing \"docker build -t app .\"",
          "\"docker build -t app .\" exited with code 0",
          "executing \"rm -rf /tmp/build/*\"",
          "\"rm -rf /tmp/build/*\" exited with code 0",
          "executing \"docker save -o docker.image app\"",
          "\"docker save -o docker.image app\" exited with code 0",
          "tar archive exited with code 0",
          "created multipart upload postbuild/3b4d909f9d",
          "completed multipart upload in 8.224 seconds"
        ],
        stderr: "",
        stdout: "this is stdout"

      }
    },
    {
      id: 'b3',
      manifest: {
        platform: 'nodejs'
      },
      commit: {
        sha: "somerandomsha3",
        commit: {message: "my second commit where I fixed things"}
      },
      source: "somegithub.com/sample/sample",
      state: 'COMPLETE',
      output: {
        log: [
          "received job",
          "shutdown scheduled for 20 minutes",
          "downloaded prebuild",
          "tar extract exited with code 0",
          "executing \"yum install -y docker\"",
          "\"yum install -y docker\" exited with code 0",
          "executing \"service docker start\"",
          "\"service docker start\" exited with code 0",
          "executing \"docker build -t app .\"",
          "\"docker build -t app .\" exited with code 0",
          "executing \"rm -rf /tmp/build/*\"",
          "\"rm -rf /tmp/build/*\" exited with code 0",
          "executing \"docker save -o docker.image app\"",
          "\"docker save -o docker.image app\" exited with code 0",
          "tar archive exited with code 0",
          "created multipart upload postbuild/3b4d909f9d",
          "completed multipart upload in 8.224 seconds"
        ],
        stderr: "",
        stdout: "this is the stdout"
      }
    },
    {
      id: 'b4355655',
      manifest: {
        platform: 'nodejs'
      },
      commit: {
        sha: "somerandomsha4",
        commit: {message: "config: where i screwed it all up"}
      },
      source: "somegithub.com/sample/sample",
      state: 'FAILED',
      output: {
        log: [
          "received job",
          "shutdown scheduled for 20 minutes",
          "downloaded prebuild",
          "tar extract exited with code 0",
          "executing \"yum install -y docker\"",
          "\"yum install -y docker\" exited with code 0",
          "executing \"service docker start\"",
          "\"service docker start\" exited with code 0",
          "executing \"docker build -t app .\"",
          "\"docker build -t app .\" exited with code 0",
          "executing \"rm -rf /tmp/build/*\"",
          "\"rm -rf /tmp/build/*\" exited with code 0",
          "executing \"docker save -o docker.image app\"",
          "\"docker save -o docker.image app\" exited with code 0",
          "tar archive exited with code 0",
          "created multipart upload postbuild/3b4d909f9d",
          "completed multipart upload in 8.224 seconds"
        ],
        stderr: "bla bla bla",
        stdout: "here be stdout"
      }
    }
  ],
  callbacks: [
    {
      key: '1234',
      module: '../../test/callback',
      method: 'executor'
    }
  ],
  admin: [
    {
      type: 'gitSource',
      source: 'github.com',
      urlPrefix: 'https://somegithub.com',
      token: 'randomToken'
    },
    {
      type: 'slack',
      team: 'test1',
      webhookUrl: 'slack.web.hook1',
      id: 's1'
    },
    {
      type: 'slack',
      team: 'test2',
      webhookUrl: 'slack.web.hook2',
      id: 's1'
    },
    {
      type: 'twilio',
      accountSid: "twilioAccount",
      token: "twilioToken",
      phone: "555555555",
      id: 't1'
    }
  ],
  events: [
    {
      type: 'DeployFailure',
      message: 'Deployment {{deploy}} failed for stack {{stack}}',
      severity: 'warn',
      context: {
        appId: 'a1',
        stackId: 's11',
        deployId: 'd123456'
      }
    },
    {
      type: 'DeploySuccess',
      message: 'Deployment {{deploy}} successful for stack {{stack}}',
      severity: 'info',
      context: {
        appId: 'a2',
        stackId: 's21',
        deployId: 'd234567'
      }
    },
    {
      type: 'HealthCheckFailure',
      message: 'Health check failed for stack {{stack}}',
      severity: 'fatal',
      context: {
        appId: 'a1',
        stackId: 's11'
      }
    }
  ],
  workers: [{
    id: "i-1234567", //Use EC2 instance id
    appId: 'a1',
    stackId: 's11',
    instanceType: "m3.medium",
    launchTime: 123456789012345,
    terminationTime: 123456789012345,
    privateIpAddress: "10.1.2.3",
    publicIpAddress: "54.1.2.3"
  }],
  addressBooks: [{
    id: "123456",
    name: "Sample Addresses",
    addresses: [
      "10.0.0.0/8" //Must be validated as CIDR format
    ]
  },
  {
    id: "223456",
    name: "Sample Other Addresses",
    addresses: [
      "11.0.0.0/8" //Must be validated as CIDR format
    ]
  }]
};
