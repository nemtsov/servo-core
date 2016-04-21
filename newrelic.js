exports.config = {
  logging: {
    level: 'info'
  },
  rules: {
    name: [
      //Config Routes
      {"pattern": "/config.*", "name" : "/config"},
      //CallBack Routes
      {"pattern": "/callbacks.*", "name" : "/callbacks"},
      //Notification Routes
      {"pattern": "/notifications.*", "name" : "/notifications"},
      //User Routes
      {"pattern": "/user/.*", "name" : "/user"},
      {"pattern": "/user/me", "name" : "/user/me"},
      {"pattern": "/user/me/preferences/.*", "name" : "/user/preferences"},
      //App Routes
      {"pattern": "/apps.*", "name" : "/apps"},
      {"pattern": "/apps/.*/config.*", "name" : "/apps/config"},
      {"pattern": "/apps/.*/notifications.*", "name" : "/apps/notifications"},
      {"pattern": "/apps/.*/events", "name" : "/apps/events"},
      //Stack Routes
      {"pattern": "/apps/.*/stacks.*", "name" : "/stacks"},
      {"pattern": "/apps/.*/stacks/.*/config.*", "name" : "/stack/config"},
      {"pattern": "/apps/.*/stacks/.*/notifications.*", "name" : "/stack/notifications"},
      {"pattern": "/apps/.*/stacks/.*/deployments.*", "name" : "/deployments"},
      {"pattern": "/apps/.*/stacks/.*/deployments/latest", "name" : "/deployments/latest"},
      {"pattern": "/apps/.*/stacks/.*/integrations", "name" : "/integrations"},
      //Resource Routes
      {"pattern": "/apps/.*/stacks/.*/resources.*", "name" : "/resources"},
      {"pattern": "/apps/.*/stacks/.*/resources/.*/inspections.*", "name" : "/inspections"}
    ]
  }
};
