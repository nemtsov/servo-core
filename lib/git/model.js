module.exports = function Commit(gitCommit) {
  this.sha = gitCommit.sha;
  this.message = gitCommit.commit.message;
  this.parents = gitCommit.parents.map(function (parent) {
    return parent.sha;
  });
  this.author = {
    username: (gitCommit.author) ? gitCommit.author.login : null,
    name: gitCommit.commit.author.name,
    email: gitCommit.commit.author.email,
    date: new Date(gitCommit.commit.author.date).getTime()
  };
  this.committer = {
    username: (gitCommit.committer) ? gitCommit.committer.login : null,
    name: gitCommit.commit.committer.name,
    email: gitCommit.commit.committer.email,
    date: new Date(gitCommit.commit.committer.date).getTime()
  };
  this._updatedAt = this.committer.date || this.author.date;
  this._createdAt = this.committer.date || this.author.date;
};