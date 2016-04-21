var db = require('_/db'),
  async = require('async'),
  platformSvc = require('_/platform');

exports.deploy = function (deploy, build, cb) {
  var props = {};
  props.appScript = [
    'service docker start',
    'docker load < docker.image',
    'sed "s/export //g" /home/app/.profile | sed "s/\'//g" > /home/app/envfile',
    'docker run --restart=always --env-file=/home/app/envfile  -e PORT=80 -p 53840:80 -d app'
  ];
  async.auto({
    setPlatform: db.stacks.updateById.bind(
      db.stacks, deploy.stackId, {platform: 'docker'}, cb
    ),
    initiate: platformSvc.initiateSetup.bind(platformSvc, deploy, build, props)
  }, cb);
  cb();
};

exports.validateManifest = function (manifest, cb) {
  if (!manifest.build) manifest.build = {
    commands: [
      'service docker start',
      'docker build -t app .',
      'rm -rf /tmp/build/*',
      'docker save -o docker.image app'
    ]
  };
  cb(null, manifest);
};