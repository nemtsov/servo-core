var stub = require('sinon').stub,
  Collection = require('../collection');

function noop() {}

describe.skip('database', function () {
  var collection, db, dbcoll;

  beforeEach(function () {
    db = stub({collection: noop});
    dbcoll = stub({
      insert: noop,
      update: noop,
      find: noop,
      findOne: noop,
      count: noop,
      ensureIndex: noop
    });
    db.collection.returns(dbcoll);
    collection = new Collection(db, 'foo');
  });

  describe('save', function () {
    it('should save new with insert', function (done) {
      collection._insert = stub().yields(null, {});
      collection._update = stub().throws();
      collection.save({foo: true}, function (err) {
        done(err);
      });
    });

    it('should save existing with update', function (done) {
      collection._insert = stub().throws();
      collection._update = stub().yields(null, {});
      collection.save({id: 1, foo: true}, function (err) {
        done(err);
      });
    });

    it('should insert a document', function (done) {
      var obj = {foo: true};
      dbcoll.insert.withArgs(obj).yields(null, [obj]);
      dbcoll.ensureIndex.yields(null, {});
      collection.save(obj, function (err, doc) {
        doc.id.should.be.ok;
        doc.foo.should.be.true;
        doc.createdAt.should.be.within(new Date().getTime() - 1000, new Date().getTime());
        doc.updatedAt.should.be.within(new Date().getTime() - 1000, new Date().getTime());
        done(err);
      });
    });

    it('should update a document', function (done) {
      var obj = {id: 1, foo: true, createdAt: 1234};
      dbcoll.update.withArgs({id: 1}, obj).yields(null, 1);
      collection.save(obj, function (err, doc) {
        doc.id.should.equal(1);
        doc.foo.should.be.true;
        doc.createdAt.should.equal(1234);
        doc.updatedAt.should.be.within(new Date().getTime() - 1000, new Date().getTime());
        done(err);
      });
    });
  });
});