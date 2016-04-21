var error = require('_/error');

module.exports = function Slack(team, webhookUrl) {
  if (!team) throw new error.BadInputError('slack team is required');
  if (!webhookUrl) throw new error.BadInputError('webhook url is required');
  this.team = team;
  this.webhookUrl = webhookUrl;
  this.type = "slack";
};