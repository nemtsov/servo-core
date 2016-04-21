module.exports = function NotificationRule(scope, type, destinations) {
  if (!Array.isArray(destinations))
    throw new Error('notification destinations must be an array');

  if (typeof type !== 'string')
    throw new Error('notification type must be a string');

  if (type.length === 0 || destinations.length === 0)
    throw new Error('notification properties must have values');

  destinations.forEach(function (destination) {
    if (!destination.transport || !destination.address)
      throw new Error('invalid notification destination');
    var knownTransports = ['email', 'opsgenie', 'slack', 'sms', 'voice', 'webhook', 'console'];
    if (knownTransports.indexOf(destination.transport) === -1) {
      throw new Error('invalid transport type');
    }
    if (destination.transport === 'slack') {
      destination = {transport: destination.transport, instance: destination.instance, address: destination.address};
    } else {
      destination = {transport: destination.transport, address: destination.address};
    }
  });

  this.type = type;
  this.scope = scope;
  this.destinations = destinations;
};

/** NotificationRules Model
 {
   type: 'WorkerPerformanceIssue' || '*',
   scope: 'stack:123' || 'app:456' || '*',
   destinations: [
   {
     transport: 'email', address: 'john.doe@dowjones.com'
   },
   {
     transport: 'slack', team: 'DowJones', address: '#devops'
   },
   {
     transport: 'opsgenie', address: 'devops_core'
   },
   {
     transport: 'webhook', address: 'https://sample.com'
   },
   {
   "transport": "sms", "address": "2013044123"
   },
   {
    transport: 'voice', address: '2013044123'
   }
 }
 **/