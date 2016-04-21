var error = require('_/error'),
  assert = require('assert'),
  settings = require('_/settings'),
  crypto = require('crypto');

module.exports = function Config(level, context, key, value, secret, md5) {
  if (!level) throw new error.BadInputError('level required');
  if (level !== 'global' && !context) throw new error.BadInputError('context required');
  if (!key) throw new error.BadInputError('key required');
  if (/[^0-9a-zA-Z-_\.]/.test(key)) throw new error.BadInputError('only alpha, numbers and -_. allowed in key');
  if (!value) throw new error.BadInputError('value required');
  if (level !== 'global' && level !== 'app' && level !== 'stack') {
    throw new error.BadInputError('level must be global, app or stack');
  }

  this.level = level;
  this.context = (level === 'global') ? null : context;
  this.key = key;
  this.value = value;

  if (secret) {
    if (!md5) {
      this.value = encrypt(value);
      md5 = decryptKeyMd5();
    } else if (md5 !== decryptKeyMd5())
        throw new error.BadInputError('md5 does not match');
    this.md5 = md5;
  }

  this.secret = secret;
  this.encrypted = secret;
};

function encrypt(plainText) {
  var algorithm = 'aes256',
    key = settings.key,
    cipher = crypto.createCipher(algorithm, key);
  return cipher.update(plainText, 'utf8', 'hex') + cipher.final('hex');
}

function decryptKeyMd5() {
  return crypto.createHash('md5').update(settings.key).digest('hex');
}