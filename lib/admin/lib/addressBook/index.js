import async from 'async';
import error from '_/error';
import db from '_/db';
import AddressBook from './model.js'

export function getAll (query, cb) {
  db.addressBooks.find({}, query, cb);
}

export function getByName (name, cb) {
  async.auto({
    indexing: (done) => {
      db.addressBooks.ensureIndex({name: 1}, {unique: true}, done);
    },
    addressBook: ['indexing', (done, results) => {
      db.addressBooks.findOne({name: name}, done);
    }]
  }, function (err, results) {
    if (err) return cb(err);
    if (!results.addressBook) return cb(new error.NotFoundError('not found in addressBooks'));
    cb(null, results.addressBook);
  })
}

export function getById (id, cb) {
  db.addressBooks.findById(id, cb);
}

export function create (name, addresses, cb) {
  let newAddressBook = null;
  try {
    newAddressBook = new AddressBook(name, addresses);
  } catch (err) {
    return cb(err);
  }
  db.addressBooks.save(newAddressBook, cb);
}

export function update (id, name, addresses, cb) {
  async.auto({
    current: db.addressBooks.findById.bind(db.addressBooks, id),
    update: ['current', (done, results) => {
      const current = results.current;
      let newAddresses = current.addresses,
        newName = current.name;
      if (addresses) {
        if (!Array.isArray(addresses))
          return done(new error.BadInputError('addresses should be an array'));
        newAddresses = addresses;
      }
      if (name) newName = name;
      db.addressBooks.updateById(id, {name: newName, addresses: newAddresses}, done);
    }],
    addressBook: ['update', db.addressBooks.findById.bind(db.addressBooks, id)]
  }, function (err, results) {
    if (err) return cb(err);
    cb(null, results.addressBook);
  });
}

export function remove (id, cb) {
  db.addressBooks.removeById(id, cb);
}
