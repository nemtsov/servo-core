import proxyquire from 'proxyquire';
import {stub} from 'sinon';

describe('git/client', () => {
  let hqStub, db, Client;
  function noop () {};

  beforeEach( ()=>{
    hqStub = stub();
    Client = proxyquire('_/git/client.js', {hyperquest: hqStub});
  });

  describe('constructor', () => {
    it('creates a client with given information', (done) => {
      var client = new Client({
        urlPrefix: 'testUrl',
        token: 'testToken'
      });
      client._urlPrefix.should.equal('testUrl');
      client._token.should.equal('testToken');
      done();
    });
  });
});
