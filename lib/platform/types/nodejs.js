import db from '_/db';
import async from 'async';
import platformSvc from '_/platform';
import getRequiredVersion from '_/platform/operations/nodeVersion';

export function deploy (deploy, build, cb) {
  let props = {};
  let newRelicLicenseKey = null;
  let mainScript = 'server.js';

  async.auto({
    appScript: (done) => {
      deploy.config.forEach((entry) => {
        if (entry.key === 'NewRelicLicenseKey') newRelicLicenseKey = entry.value;
      });
      if ( newRelicLicenseKey ) {
        props.appScript = [
          'appName=$(grep NEW_RELIC_APP_NAME /home/app/.profile | cut -d \'=\' -f2)',
          'newRelicLicenseKey=$(grep NEW_RELIC_LICENSE_KEY /home/app/.profile | cut -d \'=\' -f2)',
          'npm link newrelic',
          'echo "exports.config = {app_name:[$appName], license_key:$newRelicLicenseKey, high_security: true, logging:{level:\'info\'}}" > /home/app/newrelic.js',
          'echo "require(\'newrelic\');\n"|cat - server.js > /tmp/out && mv /tmp/out server.js',
          'touch /var/log/app.log',
          'chown app:app /var/log/app.log',
          build.manifest.version ? 'n ' + build.manifest.version : 'echo "Using default node version"',
          'su app -l -c "PORT=53840 forever -l /var/log/app.log -a start ' +
          mainScript + '"'
        ];
      } else {
        props.appScript = [
          'touch /var/log/app.log',
          'chown app:app /var/log/app.log',
          build.manifest.version ? 'n ' + build.manifest.version : 'echo "Using default node version"',
          'su app -l -c "PORT=53840 forever -l /var/log/app.log -a start ' +
          mainScript + '"'
        ];
      }
      done();
    },
    setPlatform: ['appScript', (done) => {
      db.stacks.updateById(deploy.stackId, {platform: 'nodejs'}, done);
    }],
    initiate: ['setPlatform', (done) => {
      platformSvc.initiateSetup(deploy, build, props, (err) => {
        if (err) return done(err);
        done();
      });
    }]
  }, cb);
  cb();
}

export function validateManifest (manifest, cb) {
  if (!manifest.build) manifest.build = {
    commands: ['npm install --unsafe-perm', 'npm test', 'npm prune --production']
  };

  if (manifest.version) {
    getRequiredVersion(manifest.version, function (err, requiredVersion) {
      if (err) return cb(err);
      manifest.version = requiredVersion;
      manifest.build.commands = ['n ' + manifest.version].concat(manifest.build.commands);
      cb(null, manifest);
    });
  } else
    cb(null, manifest);
}
