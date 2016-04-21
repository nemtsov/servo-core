import should from 'should';
import {resetAll, setEnvVariables} from '../util';
import * as networkSvc from '_/network';
import {app, emitter} from '../../server';

setEnvVariables();

describe('Network Service', () => {
  before((done) => {
    if (app) return done();
    emitter.on('initialized', done);
  });

  describe('#updateSecurityGroup()', () => {
    var isIngress = true;

    beforeEach((done)=> {
      resetAll(done);
    });

    /*
    FIXME -- mock db and aws calls
      it('Should return an AWS error', (done) => {
        db.configs.find.yields(null, [{value: []}]);
        ec2.describeSecurityGroups.yields(new Error('AWS Error'))

        function check(err, result) {
          err.message.should.equal('AWS Error');
          done();
        }
        networkSvc.updateSecurityGroup(isIngress, 'testStackId', 'SG_ID', check)
      });
    */

    it('should yield a DB error if stack not found', (done)=> {
      function check(err, result) {
        should.exist(err);
        err.name.should.be.equal('NotFoundError');
        err.message.should.be.equal('not found in stacks');
        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'nonExistantStack', check)
    });

    it('should authorize 2 and revoke 1', (done)=> {
      function check(err, result) {
        if (err) return done(err);
        Object.keys(result.diff.authorize).length.should.equal(2);
        Object.keys(result.diff.revoke).length.should.equal(1);
        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'networkStack1', check)
    });

    it('should add the default ports 443 & 80', (done)=> {
      function check(err, result) {
        if (err) return done(err);
        should.exist(result.diff.authorize);
        should.exist(result.diff.authorize['tcp:80:80']);
        should.exist(result.diff.authorize['tcp:443:443']);
        result.diff.authorize['tcp:80:80'].length.should.equal(2);
        result.diff.authorize['tcp:443:443'].length.should.equal(2);

        should.exist(result.diff.revoke);
        should.exist(result.diff.revoke['tcp:1:1']);
        result.diff.revoke['tcp:1:1'].length.should.equal(1);

        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'networkStack1', check)
    });

    it('should update nothing, when there is no difference between config values and existing rules', (done) => {
      function check(err, result) {
        if (err) return done(err);
        Object.keys(result.diff.authorize).length.should.equal(0);
        Object.keys(result.diff.revoke).length.should.equal(0);
        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'networkStack2', check)
    });

    it('should do nothing with invalid config entries', (done) =>{
      function check(err, result) {
        if (err) return done(err);
        Object.keys(result.diff.authorize).length.should.equal(0);
        Object.keys(result.diff.revoke).length.should.equal(0);
        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'networkStack3', check)
    });

    it('should de-dup config & add to empty SG', (done)=> {
      function check(err, result) {
        if (err) return done(err);
        Object.keys(result.diff.authorize).length.should.equal(1);
        Object.keys(result.diff.revoke).length.should.equal(0);
        done();
      }
      networkSvc.updateSecurityGroup(isIngress, 'networkStack4', check)
    });
  });
});
