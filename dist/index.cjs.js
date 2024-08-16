'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var backendPluginApi = require('@backstage/backend-plugin-api');
var alpha = require('@backstage/plugin-catalog-node/alpha');
var catalogModel = require('@backstage/catalog-model');
var pluginCatalogNode = require('@backstage/plugin-catalog-node');
var backstagePluginCommon = require('@rootly/backstage-plugin-common');

class RootlyEntityProcessor {
  logger;
  discovery;
  config;
  shouldProcessEntity = (entity) => {
    return (this.serviceIdAnnotations(entity) || this.functionalityIdAnnotations(entity) || this.teamIdAnnotations(entity)) !== void 0;
  };
  serviceIdAnnotations = (entity) => {
    return entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_SERVICE_ID] || entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_SERVICE_SLUG];
  };
  functionalityIdAnnotations = (entity) => {
    return entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_FUNCTIONALITY_ID] || entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_FUNCTIONALITY_SLUG];
  };
  teamIdAnnotations = (entity) => {
    return entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_TEAM_ID] || entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_TEAM_SLUG];
  };
  constructor({ discovery, config, logger }) {
    this.logger = logger;
    this.discovery = discovery;
    this.config = config;
    console.log("RootlyEntityProcessor initialized");
  }
  useRootlyClient = ({
    discovery,
    config,
    organizationId
  }) => {
    const configKeys = config.getConfig("rootly").keys();
    let token = config.getOptionalString(`rootly.${configKeys.at(0)}.apiKey`);
    if (organizationId) {
      token = config.getOptionalString(`rootly.${organizationId}.apiKey`);
    } else if (configKeys.length > 1) {
      let defaultOrgId = config.getConfig("rootly").keys().at(0);
      for (const orgId of config.getConfig("rootly").keys()) {
        if (config.getOptionalBoolean(`rootly.${orgId}.isDefault`)) {
          defaultOrgId = orgId;
          break;
        }
      }
      token = config.getOptionalString(`rootly.${defaultOrgId}.apiKey`);
    }
    const client = new backstagePluginCommon.RootlyApi({
      apiProxyPath: discovery.getBaseUrl("proxy"),
      apiToken: new Promise((resolve) => {
        resolve({ token });
      })
    });
    return client;
  };
  getProcessorName() {
    return "RootlyEntityProcessor";
  }
  async postProcessEntity(entity, location, emit) {
    if (this.shouldProcessEntity(entity)) {
      const rootlyClient = this.useRootlyClient({
        discovery: this.discovery,
        config: this.config,
        organizationId: entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_ORG_ID]
      });
      if (this.serviceIdAnnotations(entity)) {
        return this.processRootlyService(rootlyClient, entity, location, emit);
      } else if (this.functionalityIdAnnotations(entity)) {
        return this.processRootlyFunctionality(
          rootlyClient,
          entity,
          location,
          emit
        );
      } else if (this.teamIdAnnotations(entity)) {
        return this.processRootlyTeam(rootlyClient, entity, location, emit);
      }
    }
    return entity;
  }
  async processRootlyService(rootlyClient, entity, location, emit) {
    const entityTriplet = catalogModel.stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name
    });
    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);
    try {
      const serviceIdAnnotation = this.serviceIdAnnotations(entity);
      if (serviceIdAnnotation) {
        const annotationServiceResponse = await rootlyClient.getService(
          serviceIdAnnotation
        );
        const annotationService = annotationServiceResponse.data;
        if (annotationService.attributes.backstage_id && annotationService.attributes.backstage_id !== entityTriplet) {
          const servicesResponse = await rootlyClient.getServices({
            filter: {
              backstage_id: annotationService.attributes.backstage_id
            }
          });
          const service = servicesResponse && servicesResponse.data && servicesResponse.data.length > 0 ? servicesResponse.data[0] : null;
          if (service) {
            const response = await rootlyClient.updateServiceEntity(
              entity,
              annotationService,
              service
            );
            updateAnnotations(entity, {
              serviceId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateServiceEntity(
            entity,
            annotationService
          );
          updateAnnotations(entity, {
            serviceId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404) {
          rootlyClient.importServiceEntity(entity);
        } else {
          emit(pluginCatalogNode.processingResult.generalError(location, error.toString()));
        }
      }
    }
    return entity;
  }
  async processRootlyFunctionality(rootlyClient, entity, location, emit) {
    const entityTriplet = catalogModel.stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name
    });
    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);
    try {
      const functionalityIdAnnotation = this.functionalityIdAnnotations(entity);
      if (functionalityIdAnnotation) {
        const annotationFunctionalityResponse = await rootlyClient.getFunctionality(functionalityIdAnnotation);
        const annotationFunctionality = annotationFunctionalityResponse.data;
        if (annotationFunctionality.attributes.backstage_id && annotationFunctionality.attributes.backstage_id !== entityTriplet) {
          const functionalitiesResponse = await rootlyClient.getFunctionalities(
            {
              filter: {
                backstage_id: annotationFunctionality.attributes.backstage_id
              }
            }
          );
          const functionality = functionalitiesResponse && functionalitiesResponse.data && functionalitiesResponse.data.length > 0 ? functionalitiesResponse.data[0] : null;
          if (functionality) {
            const response = await rootlyClient.updateFunctionalityEntity(
              entity,
              annotationFunctionality,
              functionality
            );
            updateAnnotations(entity, {
              functionalityId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateFunctionalityEntity(
            entity,
            annotationFunctionality
          );
          updateAnnotations(entity, {
            functionalityId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404) {
          rootlyClient.importFunctionalityEntity(entity);
        } else {
          emit(pluginCatalogNode.processingResult.generalError(location, error.toString()));
        }
      }
    }
    return entity;
  }
  async processRootlyTeam(rootlyClient, entity, location, emit) {
    const entityTriplet = catalogModel.stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name
    });
    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);
    try {
      const teamIdAnnotation = this.teamIdAnnotations(entity);
      if (teamIdAnnotation) {
        const annotationTeamResponse = await rootlyClient.getTeam(
          teamIdAnnotation
        );
        const annotationTeam = annotationTeamResponse.data;
        if (annotationTeam.attributes.backstage_id && annotationTeam.attributes.backstage_id !== entityTriplet) {
          const teamsResponse = await rootlyClient.getTeams({
            filter: {
              backstage_id: annotationTeam.attributes.backstage_id
            }
          });
          const team = teamsResponse && teamsResponse.data && teamsResponse.data.length > 0 ? teamsResponse.data[0] : null;
          if (team) {
            const response = await rootlyClient.updateTeamEntity(
              entity,
              annotationTeam,
              team
            );
            updateAnnotations(entity, {
              teamId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateTeamEntity(
            entity,
            annotationTeam
          );
          updateAnnotations(entity, {
            teamId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404) {
          rootlyClient.importTeamEntity(entity);
        } else {
          emit(pluginCatalogNode.processingResult.generalError(location, error.toString()));
        }
      }
    }
    return entity;
  }
}
function updateAnnotations(entity, annotations) {
  if (annotations.serviceId && annotations.serviceId !== "") {
    entity.metadata.annotations["rootly.com/service-id"] = annotations.serviceId;
  } else {
    delete entity.metadata.annotations["rootly.com/service-id"];
  }
  if (annotations.functionalityId && annotations.functionalityId !== "") {
    entity.metadata.annotations["rootly.com/functionality-id"] = annotations.functionalityId;
  } else {
    delete entity.metadata.annotations["rootly.com/functionality-id"];
  }
  if (annotations.teamId && annotations.teamId !== "") {
    entity.metadata.annotations["rootly.com/team-id"] = annotations.teamId;
  } else {
    delete entity.metadata.annotations["rootly.com/team-id"];
  }
}

const catalogModuleRootlyReaderProcessor = backendPluginApi.createBackendModule({
  pluginId: "catalog",
  moduleId: "rootly-service-entity-processor",
  register(env) {
    env.registerInit({
      deps: {
        catalog: alpha.catalogProcessingExtensionPoint,
        discovery: backendPluginApi.coreServices.discovery,
        config: backendPluginApi.coreServices.rootConfig,
        logger: backendPluginApi.coreServices.logger
      },
      async init({ catalog, discovery, config, logger }) {
        catalog.addProcessor(new RootlyEntityProcessor({ discovery, config, logger }));
      }
    });
  }
});

exports.default = catalogModuleRootlyReaderProcessor;
//# sourceMappingURL=index.cjs.js.map
