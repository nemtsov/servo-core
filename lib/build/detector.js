import gitSvc from '_/git';
import error from '_/error';
import async from 'async';

function isNodejs (tree, cb) {
  let foundPackage = false;
  let foundServer = false;
  let i = 0;

  for (; i<tree.length; i++) {
    if (tree[i].path === 'package.json')
      foundPackage = true;
    if (tree[i].path === 'server.js')
      foundServer = true;
    if (foundPackage && foundServer)
      break;
  }

  cb(null, foundPackage && foundServer);
}

function isDocker (tree, cb) {
  let foundDockerfile = false;
  let i = 0;
  for (; i < tree.length; i++ ) {
    if (tree[i].path === 'Dockerfile') {
      foundDockerfile = true;
      break;
    }
  }
  cb(null, foundDockerfile);
}

export default function detect (source, sha, cb) {
  gitSvc.getTree(source, sha, (err, tree) => {
    if (err) return cb(err);
    async.auto({
      isNode: isNodejs.bind(null, tree),
      isDocker: isDocker.bind(null, tree),
      manifest: ['isNode', 'isDocker', (done, results) => {
        if ( (results.isNode && results.isDocker) || (!results.isNode&&!results.isDocker) )
          return done(new error.BadInputError('Unable to auto-detect platform'));
        if (results.isDocker)
          return cb(null, {platform: 'docker'});
        gitSvc.getJSONAtPath('package.json', source, sha, (err, packageJSON) => {
          if (err) return cb(err);
          let manifest = {platform: 'nodejs'};
          if (packageJSON.engines && packageJSON.engines.node)
            manifest.version = packageJSON.engines.node;
          cb(null, manifest);
        });
      }]
    }, (err, results) => {
      if (err) return cb(err);
      cb(null, results.manifest);
    });
  });
}
