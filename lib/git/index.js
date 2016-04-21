var db = require('_/db'),
  error = require('_/error'),
  tar = require('tar'),
  path = require('path'),
  async = require('async'),
  querystring = require('querystring'),
  fs = require('fs'),
  Client = require('./client.js'),
  parseLinkHeader = require('parse-link-header'),
  logger = require('_/logger')('git'),
  clientCache = {},
  Commit = require('./model'),
  service = module.exports = {};

/**
 * List all git sources in db
 *
 * @param {String} gitUrl e.g., github.com/users/repo.git
 */
service.getGitSources = function (cb) {
  db.git.find({}, cb);
};

/**
 * Add a new git source to db
 *
 * @param {String} gitUrl e.g., github.com/users/repo.git
 */

service.addGitSource = function (hubInfo, cb) {
  db.git.save(hubInfo, function (err, hubInfo) {
    if (err) return cb(err);
    cb(null, hubInfo);
  });
};

/**
 * Generate normalized git url
 *
 * @param {String} gitUrl e.g., github.com/org/project
 */
service.normalizeGitUrl = function (url) {
  var httpsExp = /^https:\/\/([\w\.-]+)\/([\w-\.]+\/[\w-\.]+).git$/,
    sshExp = /^git@([\w\.-]+):([\w-]+\/[\w-\.]+).git$/,
    normalExp = /^([\w\.-]+)\/([\w-]+\/[\w-\.]+)$/,
    result = {};

  if (normalExp.test(url)) {
    result.source = normalExp.exec(url)[1];
    result.repo = normalExp.exec(url)[2];
  } else {
    if (!url.match(/.+\.git$/)) url = url + '.git';
    if (httpsExp.test(url)) {
      result.source = httpsExp.exec(url)[1];
      result.repo = httpsExp.exec(url)[2];
    } else if (sshExp.test(url)) {
      result.source = sshExp.exec(url)[1];
      result.repo = sshExp.exec(url)[2];
    }
  }

  if (result.source && result.repo)
    result.normalized = result.source + '/' + result.repo;
  return result;
};

/**
 * Get git client from git repo
 *
 * @param {Object} repo e.g., {source:'github.com', name:'repo'}
 * @param {Function} cb ({Error} err, {Obejct} git client)
 */
service.getClient = function (source, cb) {
  if (clientCache[source])
    return cb(null, clientCache[source]);
  db.admin.findOne({type: 'gitSource', source: source}, function (err, hub) {
    if (err) {
      if (err.status_code === 404)
        return cb(new error.BadInputError('Git source: ' + source + '  not configured'));
      if (err.status_code === 500)
        return cb(new error.DatabaseError('Duplicate Git source configurations for ' +
          source + ', please contact Servo Admin'));
      return cb(new error.DatabaseError(err));
    }
    clientCache[source] = new Client(hub);
    return cb(null, clientCache[source]);
  });
};

/**
 * Get git object from git url
 *
 * @param {String} gitUrl e.g., git@github.com:users/repo.git
 * @param {Function} cb ({Error} err, {Obejct} git object)
 */
service.getGit = function (gitUrl, cb) {
  var normalized = service.normalizeGitUrl(gitUrl),
    source = normalized.source,
    repo = normalized.repo;

  if (!source) return cb(new error.BadInputError('unable to parse git url'));
  service.getClient(source, function (err, client) {
    if (err) return cb(new error.NotFoundError('unable to initialize git client'));
    cb(null, {
      client: client,
      source: source,
      repo: repo
    })
  });
};

/**
 * Retrieve a repo with git url
 *
 * @param {String} gitUrl e.g., git@github.com:users/repo.git
 * @param {Function} cb ({Error} err, {Obejct} repo info)
 */
service.getRepo = function (gitUrl, cb) {
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    git.client.getJSON('/repos/' + git.repo, cb);
  });
};

/**
 * Retrieve all branches of a repo
 *
 * @param {String} gitUrl e.g., git@github.com:users/repo.git
 * @param {Object} [qs] e.g. query string for pagination
 * @param {Function} cb ({Error} err, {Array} branches)
 */

service.getBranches = function (gitUrl, query, cb) {
  if (arguments.length === 2) {
    cb = query;
    query = null;
  }
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var path = '/repos/' + git.repo + '/branches';
    if (query)
      path = path + '?' + querystring.stringify(query);
    git.client.getRes(path, function (err, response) {
      if (err) return cb(err);
      var linkHeader = parseLinkHeader(response.headers.link),
        result = {
          more: (linkHeader && linkHeader.next) ? true : false,
          branches: response.body
        };
      cb(null, result);
    });
  });
};

service.getAllBranches = function (gitUrl, cb) {
  var branches = [],
    more = true,
    page = 1;
  async.whilst(function () {
    return (more)
  }, function (cb) {
    service.getBranches(gitUrl, {page: page}, function (err, results) {
      if (err) return cb(err);
      more = results.more;
      page++;
      branches = branches.concat(results.branches);
      cb();
    })
  }, function (err) {
    (err) ? cb(err) : cb(null, branches);
  });
};

/**
 * Retrieve commits of a branch of a repo
 *
 * @param {String} gitUrl e.g., git@github.com:users/repo.git
 * @param {String} [branch] default as master branch
 * @param {Object} [query] e.g. query string for pagination
 * @param {Function} cb ({Error} err, {Array} commits)
 */

service.getCommits = function (gitUrl, options, cb) {
  var query = {};
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  query.per_page = options.limit || 100;
  if (options.start) query.sha = options.start;
  if (options.before) query.until = dateToISO8601(options.before);
  if (options.after) query.since = dateToISO8601(options.after);

  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var path = '/repos/' + git.repo + '/commits?' + querystring.stringify(query);
    git.client.getRes(path, function (err, result) {
      if (err) return cb(err);
      var commits = result.body.map(function (commit) {
        return new Commit(commit);
      });
      commits.sort(function (a, b) {
        if (a._createdAt < b._createdAt) return 1;
        if (a._createdAt > b._createdAt) return -1;
        return 0;
      });
      cb(null, commits);
    });
  });
};

/**
* Get Tags
* @param {String} gitUrl repo e.g., git@github.com:users/repo.git
* @param {Object} [query] e.g., query string for pagination
* @param {Function} cb ({Error} err, {Array} tags of the repo)
*/
service.getTags = function (gitUrl, query, cb) {
  if (arguments.length === 2)
    cb = query;
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var path = '/repos/' + git.repo + '/tags';
    if (query)
      path = path + '?' + querystring.stringify(query);
    git.client.getRes(path, function (err, response) {
      if (err) return cb(err);
      var linkHeader = parseLinkHeader(response.headers.link),
        result = {
          more: (linkHeader && linkHeader.next) ? true : false,
          tags: response.body
        };
      cb(null, result);
    });
  });
};

service.getAllTags = function (gitUrl, cb) {
  var tags = [],
    more = true,
    page = 1;
  async.whilst(function () {
    return (more)
  }, function (cb) {
    service.getTags(gitUrl, {page: page}, function (err, results) {
      if (err) return cb(err);
      more = results.more;
      page++;
      tags = tags.concat(results.tags);
      cb();
    })
  }, function (err) {
    (err) ? cb(err) : cb(null, tags);
  });
};

/**
* Retrive file and parse it as JSON given the sha of a commit
*
*@param {String} path e.g., .servo
*@param {String} gitUrl e.g., servo/sample.app
*@param {String} sha git commit sha of the tree
*@param {Function} cb ({Error} err, {Object} JSON object)
*/
service.getJSONAtPath = function (path, gitUrl, sha, cb) {
  logger.info('getJSONAtPath', 'gitUrl', gitUrl, 'path', path);
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var client = git.client,
      repo = git.repo;

    function getTree (done) {
      client.getJSON('/repos/' + repo + '/git/trees/' + sha, function (err, tree) {
        if (err) return done(new error.ServoError('cannot get tree of ' + repo + ' with ' + sha));
        done(null, tree.tree);
      });
    }

    function filterTree (tree, done) {
      async.filter(tree, function (file, pass) {
        return pass(file.path === path);
      }, function (results) {
        if (results.length === 0)
          return done(new error.BadInputError(path, 'does not exist'));
        done(null, results[0].sha);
      });
    }

    function getBlob (blobSha, done) {
      client.getJSON('/repos/' + repo + '/git/blobs/' + blobSha, function (err, blob) {
        if (err) return done(new error.ServoError('Can not get Blob of ' + repo + 'with' + blobSha));
        done(null, blob);
      });
    }

    function decodeContent (content, encoding) {
      var buf = new Buffer(content, encoding);
      return buf.toString();
    }

    function getContent (blob, done) {
      done(null, decodeContent(blob.content, blob.encoding));
    }

    function parse (content, done) {
      var err = null;
      try {
        content = JSON.parse(content);
      } catch (e) {
        err = new error.ServoError('Can not parse .servo of commit ' + sha);
      }
      done(err, content);
    }

    async.waterfall([
      getTree,
      filterTree,
      getBlob,
      getContent,
      parse
    ], cb);
  });
};

/**
 * Retrieve .servo given the sha of a commit
 *
 * @param {String} gitUrl e.g., servo/sample.app
 * @param {String} sha git commit hash of the tree
 * @param {Function} cb ({Error} err, {Object} manifest object)
 */

service.getManifest = function (gitUrl, sha, cb) {
  service.getJSONAtPath('.servo', gitUrl, sha, cb);
};

service.getTree = function (gitUrl, sha, cb) {
  logger.info('in getTree', 'gitUrl', gitUrl, 'sha', sha);
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var client = git.client,
      repo = git.repo;
    client.getJSON('/repos/' + repo + '/git/trees/' + sha, function (err, data) {
      console.error(err);
      if (err) return cb(new error.ServoError('cannot get tree of ' + repo + ' with ' + sha));
      cb(null, data.tree);
    });
  });
};

service.getCommit = function (gitUrl, sha, cb) {
  async.auto({
    git: service.getGit.bind(service, gitUrl),
    commit: ['git', function (cb, results) {
      var url = '/repos/' + results.git.repo + '/commits/' + sha;
      results.git.client.getJSON(url, cb);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    cb(null, new Commit(results.commit));
  });
};

/**
 * get stream  of the repository contents
 *
 * @param {String} repo e.g., servo/sample.app
 * @param {String} sha git commit hash of the tree
 * @param {Function} cb ({Error} err, {Stream} Stream of repository content)
 */

service.getArchiveStream = function (gitUrl, sha, cb) {
  service.getGit(gitUrl, function (err, git) {
    if (err) return cb(err);
    var repo = git.repo,
      path = '/repos/' + repo + '/tarball/' + sha;
    git.client.get(path, function (err, res) {
      if (err) return cb(new error.ServoError('Can not find tarball of sha:' + sha));
      if (res.statusCode !== 302) {
        return cb(new error.ServoError('git status not 302 for: ' + path));
      }
      git.client.get(res.headers.location, function (err, res) {
        cb(null, res);
      });
    });
  });
};

function dateToISO8601(date) {
  var d = new Date(date);
  function pad (n) {
    return n<10 ? '0' + n : n;
  }
  return d.getUTCFullYear()
    + '-' + pad(d.getUTCMonth() + 1)
    + '-' + pad(d.getUTCDate())
    + 'T' + pad(d.getUTCHours())
    + ':' + pad(d.getUTCMinutes())
    + ':' + pad(d.getUTCSeconds())
    + 'Z';
}
