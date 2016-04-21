var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /config', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on("initialized", done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all global configs', function (done) {
    request(app)
      .get('/config')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get all app configs', function (done) {
    request(app)
      .get('/apps/sample-app/config/')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get all stack configs', function (done) {
    request(app)
      .get('/apps/sample-app/stacks/feature-test-42/config/')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should create, update, delete a global config', function (done) {
    createUpdateDelete('/config/', done);
  });

  it('should create, update, delete a app config', function (done) {
    createUpdateDelete('/apps/sample-app/config/', done);
  });

  it('should create, update, delete a stack config', function (done) {
    createUpdateDelete('/apps/sample-app/stacks/feature-test-42/config/', done);
  });
});

function createUpdateDelete(path, cb) {
  async.auto({
    create: function (cb) {
      var body = {
        key: 'something',
        value: 'value',
        secret: true
      };
      request(app)
        .post(path)
        .send(body)
        .expect(200, cb);
    },
    update: ['create', function (cb, results) {
      request(app)
        .put(path + results.create.body.id)
        .send({value: 'newValue'})
        .expect(200, cb);
    }],
    del: ['update', function (cb, results) {
      request(app)
        .del(path + results.create.body.id)
        .expect(204, cb);
    }]
  }, cb);
}
