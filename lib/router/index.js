var express = require('express'),
  router = module.exports = express.Router(),
  contextualizer = require('./contextualizer');

router.param('appHandle', contextualizer.app);
router.param('stackHandle', contextualizer.stack);
router.param('deployId', contextualizer.deploy);
router.param('buildId', contextualizer.build);

router.route('/_health')
  .get(require('_/health/resource').get);

router.route('/apps/')
  .get(require('_/app/resource').getAll)
  .post(require('_/app/resource').post);

router.route('/events')
  .get(require('_/event/resource').getAll);

router.route('/apps/:appHandle')
  .get(require('_/app/resource').getOne)
  .put(require('_/app/resource').put)
  .delete(require('_/app/resource').del);

router.route('/apps/:appHandle/events')
  .get(require('_/event/resource').getAll);

router.route('/apps/:appHandle/stacks/')
  .get(require('_/stack/resource').getAll)
  .post(require('_/stack/resource').post);

router.route('/apps/:appHandle/stacks/:stackHandle')
  .get(require('_/stack/resource').getOne)
  .delete(require('_/stack/resource').del);

router.route('/apps/:appHandle/stacks/:stackHandle/events')
  .get(require('_/event/resource').getAll);

router.route('/apps/:appHandle/repo/branches')
  .get(require('_/repo/resource').getBranches);

router.route('/apps/:appHandle/repo/tags')
 .get(require('_/repo/resource').getTags);

router.route('/apps/:appHandle/repo/commits')
 .get(require('_/repo/resource').getCommits);

router.route('/apps/:appHandle/builds/:buildId')
  .get(require('_/build/resource').getOne);

router.route('/apps/:appHandle/builds/:buildId/report')
  .get(require('_/build/resource').getReport);

router.route('/apps/:appHandle/builds/:buildId/artifact')
  .get(require('_/build/resource').getArtifactLink);

router.route('/apps/:appHandle/builds')
  .get(require('_/build/resource').getAll)
  .post(require('_/build/resource').post);

router.route('/apps/:appHandle/stacks/:stackHandle/deploys/')
  .get(require('_/deploy/resource').getAll)
  .post(require('_/deploy/resource').post);

router.route('/apps/:appHandle/stacks/:stackHandle/deploys/latest')
  .get(require('_/deploy/resource').getLatest);

router.route('/apps/:appHandle/stacks/:stackHandle/deploys/:deployId')
  .get(require('_/deploy/resource').getOne);

router.route(['/config/',
  '/apps/:appHandle/config/',
  '/apps/:appHandle/stacks/:stackHandle/config/'])
  .get(require('_/config/resource').getAll)
  .post(require('_/config/resource').post);

router.route(['/config/:configId',
  '/apps/:appHandle/config/:configId',
  '/apps/:appHandle/stacks/:stackHandle/config/:configId'])
  .put(require('_/config/resource').put)
  .delete(require('_/config/resource').del);

// Special route for secret configs
router.route(['/config/:configId/plaintext',
  '/apps/:appHandle/config/:configId/plaintext',
  '/apps/:appHandle/stacks/:stackHandle/config/:configId/plaintext'])
  .get(require('_/config/resource').get);

router.route(['/notifications/',
  '/apps/:appHandle/notifications/',
  '/apps/:appHandle/stacks/:stackHandle/notifications/'])
  .get(require('_/notification/resource').getAll)
  .post(require('_/notification/resource').post);

router.route(['/notifications/:notificationId',
  '/apps/:appHandle/notifications/:notificationId',
  '/apps/:appHandle/stacks/:stackHandle/notifications/:notificationId'])
  .put(require('_/notification/resource').put)
  .delete(require('_/notification/resource').del);

router.route('/callbacks/:key')
  .post(require('_/callback/resource').post);

router.route('/metadata/eventTypes')
  .get(require('_/metadata/resource').getAllEventTypes);

router.route('/metadata/notificationTransports')
  .get(require('_/metadata/resource').getNotificationTransports);

router.route('/admin/gitsources')
  .get(require('_/admin/lib/gitsource/resource').getAll)
  .post(require('_/admin/lib/gitsource/resource').post);

router.route('/admin/gitsources/:gitSourceId')
  .get(require('_/admin/lib/gitsource/resource').getOne)
  .put(require('_/admin/lib/gitsource/resource').put)
  .delete(require('_/admin/lib/gitsource/resource').del);

router.route('/admin/slack')
  .get(require('_/admin/lib/slack/resource').getAll)
  .post(require('_/admin/lib/slack/resource').post);

router.route('/admin/slack/:slackId')
  .get(require('_/admin/lib/slack/resource').getOne)
  .put(require('_/admin/lib/slack/resource').put)
  .delete(require('_/admin/lib/slack/resource').del);

router.route('/admin/opsgenie')
  .get(require('_/admin/lib/opsgenie/resource').getAll)
  .post(require('_/admin/lib/opsgenie/resource').post);

router.route('/admin/opsgenie/:opsgenieId')
  .get(require('_/admin/lib/opsgenie/resource').getOne)
  .put(require('_/admin/lib/opsgenie/resource').put)
  .delete(require('_/admin/lib/opsgenie/resource').del);

router.route('/admin/twilio')
  .get(require('_/admin/lib/twilio/resource').getAll)
  .post(require('_/admin/lib/twilio/resource').post);

router.route('/admin/twilio/:twilioId')
  .get(require('_/admin/lib/twilio/resource').getOne)
  .put(require('_/admin/lib/twilio/resource').put)
  .delete(require('_/admin/lib/twilio/resource').del);

router.route('/admin/addressBooks')
  .get(require('_/admin/lib/addressBook/resource').getAll)
  .post(require('_/admin/lib/addressBook/resource').post);

router.route('/admin/addressBooks/:addressBookId')
  .delete(require('_/admin/lib/addressBook/resource').del)
  .put(require('_/admin/lib/addressBook/resource').put);

router.route('/apps/:appHandle/stacks/:stackHandle/logs')
  .get(require('_/log/resource').getLogSources);

router.route('/apps/:appHandle/stacks/:stackHandle/logs/:source')
  .get(require('_/log/resource').getLogEntries);

router.route('/apps/:appHandle/stacks/:stackHandle/workers')
  .get(require('_/worker/resource').getAll);

router.route('/apps/:appHandle/stacks/:stackHandle/workers/:workerId')
  .get(require('_/worker/resource').getOne);

router.route('/apps/:appHandle/stacks/:stackHandle/workers/:workerId/status')
  .get(require('_/worker/resource').getWorkerStatus);

router.route('/distributions')
  .get(require('_/distribution/resource').listDistributions)
  .post(require('_/distribution/resource').postDistribution);

router.route('/distributions/:distribution')
  .delete(require('_/distribution/resource').deleteDistribution);

router.route('/distributions/:distribution/notifications')
  .get(require('_/distribution/notification/resource').get)
  .post(require('_/distribution/notification/resource').post);

router.route('/distributions/:distribution/origins')
  .get(require('_/distribution/resource').listOrigins)
  .post(require('_/distribution/resource').postOrigin);

router.route('/distributions/:distribution/origins/:origin')
  .delete(require('_/distribution/resource').deleteOrigin)
  .put(require('_/distribution/resource').updateOrigin);
