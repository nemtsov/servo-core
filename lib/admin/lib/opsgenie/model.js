import error from '_/error';

module.exports = function opsgenie(url, key) {
  if (!url) throw new error.BadInputError('OpsGenie URL is required');
  if (!key) throw new error.BadInputError('OpsGenie Key is required');
  this.url = url;
  this.key = key;
  this.type = 'opsgenie';
};
