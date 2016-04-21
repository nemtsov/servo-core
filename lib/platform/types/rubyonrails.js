var db = require('_/db'),
  async = require('async'),
  platformSvc = require('_/platform');

exports.deploy = function (deploy, build, cb) {
  var props = {};
  if (build.manifest.properties && build.manifest.properties.startCommand) {
    props.appScript = [
      "su app -l -c '" + build.manifest.properties.startCommand + "'"
    ]
  } else {
    props.appScript = [
      //TODO add New Relic agent
      'su app -l -c "/usr/local/bin/bundle exec rake db:migrate"',
      'su app -l -c "/usr/local/bin/bundle exec unicorn -p 53840 -c ./config/unicorn.rb"'
    ];
  }
  async.auto({
    setPlatform: db.stacks.updateById.bind(
      db.stacks, deploy.stackId, {platform: 'rubyonrails'}, cb
    ),
    initiate: platformSvc.initiateSetup.bind(platformSvc, deploy, build, props)
  }, cb);
  cb();
};

exports.validateManifest = function (manifest, cb) {
  if (!manifest.build) manifest.build = {
    commands: [
      '/usr/local/bin/bundle install --deployment'
    ]
  };
  cb(null, manifest);
};