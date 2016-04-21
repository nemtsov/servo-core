var bunyan = require('bunyan'),
  settings = require('_/settings'),
  PrettyStream = require('bunyan-prettystream'),
  stream = process.stdout,
  logger, prettyStdOut;

if (!settings.production) {
  prettyStdOut = new PrettyStream();
  prettyStdOut.pipe(process.stdout);
  stream = prettyStdOut;
}

logger = bunyan.createLogger({
  name: 'servo-core',
  stream: stream,
  level: (settings.test) ? 'fatal' : 'debug'
});

module.exports = function (moduleName) {
  return logger.child({
    module: moduleName
  });
};