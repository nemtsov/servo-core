var request = require('supertest'),
  app, called = false;

require('./util').setEnvVariables();

describe('API /callbacks', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on("initialized", done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should post a callback', function (done) {
    var body = {key: '1234'};
    request(app)
      .post('/callbacks/1234')
      .send(body)
      .expect(202, function (err) {
        if (err) return cb(err);
        done((called) ? null : 'failed to execute callback');
      });
  });
});

exports.executor = function (data, body, cb) {
  called = true;
  cb();
};