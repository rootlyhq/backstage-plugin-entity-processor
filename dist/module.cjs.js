'use strict';

var backendPluginApi = require('@backstage/backend-plugin-api');
var alpha = require('@backstage/plugin-catalog-node/alpha');
var RootlyEntityProcessor = require('./processor/RootlyEntityProcessor.cjs.js');

const catalogModuleRootlyReaderProcessor = backendPluginApi.createBackendModule({
  pluginId: "catalog",
  moduleId: "rootly-service-entity-processor",
  register(env) {
    env.registerInit({
      deps: {
        catalog: alpha.catalogProcessingExtensionPoint,
        auth: backendPluginApi.coreServices.auth,
        discovery: backendPluginApi.coreServices.discovery,
        config: backendPluginApi.coreServices.rootConfig,
        logger: backendPluginApi.coreServices.logger
      },
      async init({ catalog, auth, discovery, config, logger }) {
        catalog.addProcessor(new RootlyEntityProcessor.RootlyEntityProcessor({ auth, discovery, config, logger }));
      }
    });
  }
});

exports.catalogModuleRootlyReaderProcessor = catalogModuleRootlyReaderProcessor;
//# sourceMappingURL=module.cjs.js.map
