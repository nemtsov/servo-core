import should from 'should';
import proxyquire from 'proxyquire';
import {resetAll, setEnvVariables} from '../util';
import {app, emitter} from '../../server';
import * as DistributionNotification from '_/distribution/notification';

proxyquire.noCallThru();
setEnvVariables();

describe('Distribution Notifications', () => {
  before((done) => {
    if (app) return done();
    emitter.on('initialized', done);
  });

  describe('#createTopic', ()=>{
    it('should fail with incorrect distribution', (done) => {
      DistributionNotification.createTopic({}, (err, data) => {
        should.exist(err);
        err.message.should.equal('Distribution must be specified')
        done()
      });
    });

    it('should pass with correct distribution', (done) => {
      DistributionNotification.createTopic({distribution: 'test'}, (err, data) => {
        should.not.exist(err);
        data.TopicArn.indexOf('arn:aws').should.be.equal(0);
        done()
      });
    });
  });

  describe('#addSubscription', ()=>{
    it('should fail with incorrect distribution', (done) => {
      DistributionNotification.addSubscription({}, 'test@test.com', (err, data) => {
        should.exist(err);
        err.message.should.equal('Distribution must be specified')
        done()
      });
    });

    it('should fail with incorrect email', (done) => {
      DistributionNotification.addSubscription({}, 'wrong email', (err, data) => {
        should.exist(err);
        err.message.should.equal('Input a valid email')
        done()
      });
    });

    it('should pass with correct distribution', (done) => {
      DistributionNotification.addSubscription({distribution: 'test'},'test@test.com', (err, data) => {
        should.not.exist(err);
        data.should.equal('testArn');
        done()
      });
    });
  });

  describe('#getTopic', ()=>{
    it('should fail with incorrect distribution', (done) => {
      DistributionNotification.getTopic({}, (err, data) => {
        should.exist(err);
        err.message.should.equal('Distribution must be specified')
        done()
      });
    });

    it('should pass with correct distribution', (done) => {
      DistributionNotification.getTopic({distribution: 'test'}, (err, data) => {
        should.not.exist(err);
        data[0].should.equal('test@test.com');
        done();
      });
    });
  });

  describe('#deleteTopic', ()=>{
    it('should fail with incorrect distribution', (done) => {
      DistributionNotification.deleteTopic({}, (err, data) => {
        should.exist(err);
        err.message.should.equal('Distribution must be specified')
        done()
      });
    });

    it('should pass with correct distribution', (done) => {
      DistributionNotification.deleteTopic({distribution: 'test'}, (err, data) => {
        should.not.exist(err);
        done();
      });
    });
  });

});
