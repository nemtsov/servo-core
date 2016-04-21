var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /deploys', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on('initialized', done);
  });

  it('should get all deployments', function (done) {
    request(app)
      .get('/apps/sample-app/stacks/feature-test-42/deploys')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it.skip('should create stack, deploy, redeploy, and delete', function (done) {
    this.timeout(5000);
    async.auto({
      stack: function (cb) {
        var body = {
          name: 'Deploy Test',
          summary: 'this is a test stack'
        };
        request(app)
          .post('/apps/sample-app/stacks')
          .send(body)
          .expect(200, cb);
      },
      deploy: ['stack', function (cb) {
        request(app)
          .post('/apps/sample-app/stacks/deploy-test/deploys')
          .send({buildId: 'b1'})
          .expect(202, cb);
      }],
      checkById: ['deploy', function (cb, results) {
        var id = results.deploy.body.id;
        request(app)
          .get('/apps/sample-app/stacks/deploy-test/deploys/' + id)
          .expect('Content-Type', /json/)
          .expect(200, cb);
      }],
      checkByLatest: ['deploy', function (cb) {
        request(app)
          .get('/apps/sample-app/stacks/deploy-test/deploys/latest')
          .expect('Content-Type', /json/)
          .expect(200, cb);
      }],
      deployWait: ['deploy', function (cb, results) {
        var id = results.deploy.body.id;
        waitComplete(id, cb);
      }],
      redeploy: ['deployWait', function (cb) {
        request(app)
          .post('/apps/sample-app/stacks/deploy-test/deploys')
          .send({buildId: 'b1'})
          .expect(202, cb);
      }],
      redeployWait: ['redeploy', function (cb, results) {
        var id = results.redeploy.body.id;
        waitComplete(id, cb);
      }],
      del: ['redeployWait', function (cb) {
        request(app)
          .del('/apps/sample-app/stacks/deploy-test')
          .expect(204, cb);
      }]
    }, done);
  });
});

function waitComplete(id, cb) {
  var complete = false;
  async.until(
    function () {
      return complete;
    },
    function (cb) {
      request(app)
        .get('/apps/sample-app/stacks/deploy-test/deploys/' + id)
        .expect('Content-Type', /json/)
        .expect(function (res) {
          if (res.body.state === 'COMPLETE') complete = true;
        })
        .end(cb);
    }, cb
  );
}
