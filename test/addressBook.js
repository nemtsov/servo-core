var request = require('supertest'),
  async = require('async'),
  app;

require('./util').setEnvVariables();

describe('API /admin/addressBooks', function () {
  before(function (done) {
    app = require('../server').app;
    if (app) return done();
    require('../server').emitter.on('initialized', done);
  });

  beforeEach(function (done) {
    require('./util').resetAll(done);
  });

  it('should get all network address books', function (done) {
    request(app)
      .get('/admin/addressBooks')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.length.should.equal(2);
        done();
      });
  });

  it('should post, update, and delete an address book', function (done) {
    async.auto({
      create: function (cb) {
        var body = {
          name: "Address Book Entry",
          addresses: ["10.0.0.0/8"]
        };
        request(app)
          .post('/admin/addressBooks')
          .send(body)
          .expect(200, cb);
      },
      update: ['create', (cb, results) => {
        var body = {
          name: "Address Book Entry 2"
        };
        request(app)
          .put('/admin/addressBooks/' + results.create.body.id)
          .send(body)
          .expect((res) => {
            res.body.id.should.eql(results.create.body.id);
            res.body.name.should.eql("Address Book Entry 2");
            res.body.addresses.should.eql(["10.0.0.0/8"]);
            res.status.should.eql(200);
          })
          .end(cb);
      }],
      del: ['update', function (cb, results) {
        request(app)
          .del('/admin/addressBooks/' + results.create.body.id)
          .expect(204, cb);
      }]
    }, done);
  });

  it('should yield error if name is missing for the addressBook', function (done) {
    var body = {
      addresses: ["10.0.0.0"]
    };
    request(app)
      .post('/admin/addressBooks')
      .send(body)
      .expect(400, done);
  });
});
