var request = require('supertest'),
  app;

require('./util').setEnvVariables();

describe.skip('API /builds', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on("initialized", done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all branches', function (done) {
    request(app)
      .get('/apps/sample-node/repo/branches')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get all tags', function (done) {
    request(app)
      .get('/apps/sample-node/repo/tags')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get a specific build', function (done) {
    request(app)
      .get('/apps/sample-node/builds/b1')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
