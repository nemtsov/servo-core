var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /workers', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on("initialized", done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should return workers of stack', function (done) {
    request(app)
      .get('/apps/sample-app/stacks/feature-test-42/workers')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
