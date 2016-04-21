var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /apps', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on('initialized', done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all apps', function (done) {
    request(app)
      .get('/apps')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should get a specific app', function (done) {
    request(app)
      .get('/apps/sample-app')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it.skip('should post, get and delete an app', function (done) {
    async.auto({
      create: function (cb) {
        var body = {
          name: 'test application',
          source: 'github.com/nodejs/node'
        };
        request(app)
          .post('/apps/')
          .send(body)
          .expect(200, cb);
      },
      find: ['create', function (cb, results) {
        request(app)
          .get('/apps/' + results.create.body.handle)
          .expect('Content-Type', /json/)
          .expect(200, cb);
      }],
      del: ['find', function (cb, results) {
        request(app)
          .del('/apps/' + results.create.body.handle)
          .expect(204, cb);
      }]
    }, done);
  });

  it('should get apps with limit and pagination', function (done) {
    var found = [];
    async.auto({
      first: function (cb) {
        request(app)
          .get('/apps?limit=2')
          .expect(function (res) {
            if (res.body.length !== 2) throw new Error('expected 2 results');
            res.body.forEach(function (item) {
              found.push(item.handle);
            });
          })
          .end(cb);
      },
      second: ['first', function (cb, results) {
        var next = results.first.headers.next;
        if (!next) return cb(new Error('expected next header'));
        request(app)
          .get('/apps?limit=2&createdBefore=' + next)
          .expect(function (res) {
            if (res.body.length !== 2) throw new Error('expected 2 results');
            res.body.forEach(function (item) {
              if (found.indexOf(item.handle) !== -1) throw new Error('same result returned');
              found.push(item.handle);
            });
          })
          .end(cb);
      }]
    }, done)
  });
});
