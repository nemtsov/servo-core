var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /events', function () {
  before(function (done) {
    async.auto({
      server: function (done) {
        app = require('../server').app;
        if (app) return done();
        require('../server').emitter.on("initialized", done);
      },
      db: ['server', function (done) {
        require('./util').resetAll(done);
      }]
    }, done);
  });

  // beforeEach(function (done) {
  // });

  it('should get all events', function (done) {
    request(app)
      .get('/events')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  //TODO enable these tests when tingodb reset is working
  it('should get all app events', function (done) {
    request(app)
      .get('/apps/sample-app/events/')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        res.body.should.have.length(2);
        res.body[0].should.have.property('type');
        res.body[0].type.should.equal("DeployFailure");
        res.body[0].context.appId.should.equal("a1");
        res.body[1].type.should.equal("HealthCheckFailure");
        res.body[1].context.appId.should.equal("a1");
        done();
      });
  });

  it('should get all stack events', function (done) {
    request(app)
      .get('/apps/test-app/stacks/production/events/')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        res.body.should.have.length(1);
        res.body[0].should.have.property('type');
        res.body[0].type.should.equal("DeploySuccess");
        res.body[0].context.appId.should.equal("a2");
        res.body[0].context.stackId.should.equal("s21");
        done();
      });
  });
});
