var request = require('supertest'),
  app;

require('./util').setEnvVariables();

describe('API /metadata', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on('initialized', done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all event types', function (done) {
    request(app)
      .get('/metadata/eventTypes')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get notification transports', function (done) {
    request(app)
      .get('/metadata/notificationTransports')
      .expect([{id: "Slack", teams: ["test1", "test2"], type: "Slack"}, {id: "t1", type: "Twilio"}], done);
  });
});
