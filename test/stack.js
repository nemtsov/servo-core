var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /stacks', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on("initialized", done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all stacks', function (done) {
    request(app)
      .get('/apps/sample-app/stacks')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get a specific stack', function (done) {
    request(app)
      .get('/apps/sample-app/stacks/feature-test-42')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should post, get and delete a stack', function (done) {
    async.auto({
      create: function (cb) {
        var body = {
          name: 'test stack',
          summary: 'this is a test stack'
        };
        request(app)
          .post('/apps/sample-app/stacks')
          .send(body)
          .expect(200, cb);
      },
      find: ['create', function (cb, results) {
        request(app)
          .get('/apps/sample-app/stacks/' + results.create.body.handle)
          .expect('Content-Type', /json/)
          .expect(200, cb);
      }],
      del: ['find', function (cb, results) {
        request(app)
          .del('/apps/sample-app/stacks/' + results.create.body.handle)
          .expect(204, cb);
      }]
    }, done);
  });
});
