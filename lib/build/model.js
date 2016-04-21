module.exports = function Build(commit, manifest, source, key) {
  this.commit = commit;
  this.manifest = manifest;
  this.source = source;
  this.state = 'PENDING';
  this.output = {};
  this.key = key;
};

/*
{
  commit: {
    "sha": "1234",
    "message": "added readme, because im a good github citizen\n",
    "parent": "123465",
    "date": "123456789012345"
    "author": {
      "name": "Example Author",
      "email": "email@example.com"
    },
    "committer": {
      "name": "Example Author",
      "email": "email@example.com"
     }
  },
  manifest: {
    resources: {
      MyApp: {
        type: 'node.app'
      }
    }
  },
  source: 'https://example.com/user/repo.git',
  state: 'FAILED'
}
 */
