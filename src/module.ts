import { coreServices, createBackendModule } from "@backstage/backend-plugin-api";
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { RootlyEntityProcessor } from "./processor";

/** @public */
export const catalogModuleRootlyReaderProcessor = createBackendModule({
    pluginId: 'catalog',
    moduleId: 'rootly-service-entity-processor',
    register(env) {
      env.registerInit({
        deps: {
          catalog: catalogProcessingExtensionPoint,
          auth: coreServices.auth,
          discovery: coreServices.discovery,
          config: coreServices.rootConfig,
          logger: coreServices.logger,
        },
        async init({ catalog, auth, discovery, config, logger }) {
          catalog.addProcessor(new RootlyEntityProcessor({auth: auth, discovery: discovery, config: config, logger: logger}));
        },
      });
    },
  });