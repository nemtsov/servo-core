import {exec} from 'child_process';
import semver from 'semver';
import async from 'async';

function getAllNodeVersions (cb) {
  exec('n ls', function (err, stdout, stderr) {
    if (err) return cb(err);
    let versions = stdout.toString().match(/(\d+\.){2}\d+/g);
    cb(null, versions.map((version) => {
      return version.toString();
    }));
  });
}

export default function getRequiredVersion (range, cb) {
  async.auto({
    versions: getAllNodeVersions,
    selected: ['versions', (done, results) => {
      let i = results.versions.length - 1;
      let selected = null;
      let majorVersion = null;
      for (; i > -1; i--) {
        if (semver.satisfies(results.versions[i], range)) {
          selected = results.versions[i];
          break;
        }
      }

      if (selected === null)
        return cb(null, 'Can not find node verson meet package requirement');

      majorVersion = selected.match(/^\d+\.\d+/).toString();
      done(null, majorVersion);
    }]
  }, (err, results) => {
    if (err) return cb(err);
    cb(null, results.selected);
  });
}
