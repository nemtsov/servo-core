module.exports = [
  {
    type: 'Scaling:Increase',
    level: 'info',
    service: 'search.Service',
    job: 'newInstanceHandler'
  },
  {
    type: 'Scaling:Initial',
    level: 'info',
    service: 'search.Service',
    job: 'newInstanceHandler'
  }
];