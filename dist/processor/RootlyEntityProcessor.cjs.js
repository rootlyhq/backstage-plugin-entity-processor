'use strict';

var catalogModel = require('@backstage/catalog-model');
var backstagePluginCommon = require('@rootly/backstage-plugin-common');

class RootlyEntityProcessor {
  logger;
  auth;
  discovery;
  config;
  shouldProcessEntity = (entity) => {
    return (this.serviceIdAnnotations(entity) || this.functionalityIdAnnotations(entity) || this.teamIdAnnotations(entity) || this.catalogEntityIdAnnotations(entity)) !== void 0;
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
  catalogEntityIdAnnotations = (entity) => {
    return entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ENTITY_ID] || entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ENTITY_SLUG];
  };
  constructor({
    auth,
    discovery,
    config,
    logger
  }) {
    this.logger = logger;
    this.auth = auth;
    this.discovery = discovery;
    this.config = config;
    console.log("RootlyEntityProcessor initialized");
  }
  useRootlyClient = async ({
    auth,
    discovery,
    config,
    organizationId
  }) => {
    const configKeys = config.getConfig("rootly").keys();
    let apiProxyPath = config.getOptionalString(
      `rootly.${configKeys.at(0)}.proxyPath`
    );
    if (organizationId) {
      apiProxyPath = config.getOptionalString(
        `rootly.${organizationId}.proxyPath`
      );
    } else if (configKeys.length > 1) {
      let defaultOrgId = config.getConfig("rootly").keys().at(0);
      for (const orgId of config.getConfig("rootly").keys()) {
        if (config.getOptionalBoolean(`rootly.${orgId}.isDefault`)) {
          defaultOrgId = orgId;
          break;
        }
      }
      apiProxyPath = config.getOptionalString(
        `rootly.${defaultOrgId}.proxyPath`
      );
    }
    const token = auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: "proxy"
      // e.g. 'catalog'
    });
    const client = new backstagePluginCommon.RootlyApi({
      apiProxyUrl: discovery.getBaseUrl("proxy"),
      apiProxyPath,
      apiToken: token
    });
    return client;
  };
  getProcessorName() {
    return "RootlyEntityProcessor";
  }
  async postProcessEntity(entity, location, emit) {
    if (this.shouldProcessEntity(entity)) {
      const organizationId = entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_ORG_ID];
      const rootlyClient = await this.useRootlyClient({
        auth: this.auth,
        discovery: this.discovery,
        config: this.config,
        organizationId
      });
      if (this.serviceIdAnnotations(entity)) {
        return this.processRootlyService(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit
        );
      } else if (this.functionalityIdAnnotations(entity)) {
        return this.processRootlyFunctionality(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit
        );
      } else if (this.teamIdAnnotations(entity)) {
        return this.processRootlyTeam(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit
        );
      } else if (this.catalogEntityIdAnnotations(entity)) {
        return this.processRootlyCatalogEntity(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit
        );
      }
    }
    return entity;
  }
  async processRootlyService(rootlyClient, organizationId, entity, location, emit) {
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
            updateAnnotations(entity, organizationId, {
              serviceId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateServiceEntity(
            entity,
            annotationService
          );
          updateAnnotations(entity, organizationId, {
            serviceId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404 && entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_SERVICE_AUTO_IMPORT]) {
          try {
            await rootlyClient.importServiceEntity(entity);
          } catch (importError) {
            if (importError instanceof Error) {
              this.logger.error(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`
          );
        }
      }
    }
    return entity;
  }
  async processRootlyFunctionality(rootlyClient, organizationId, entity, location, emit) {
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
            updateAnnotations(entity, organizationId, {
              functionalityId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateFunctionalityEntity(
            entity,
            annotationFunctionality
          );
          updateAnnotations(entity, organizationId, {
            functionalityId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404 && entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_FUNCTIONALITY_AUTO_IMPORT]) {
          try {
            await rootlyClient.importFunctionalityEntity(entity);
          } catch (importError) {
            if (importError instanceof Error) {
              this.logger.error(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`
          );
        }
      }
    }
    return entity;
  }
  async processRootlyTeam(rootlyClient, organizationId, entity, location, emit) {
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
            updateAnnotations(entity, organizationId, {
              teamId: response.data.id
            });
          }
        } else {
          const response = await rootlyClient.updateTeamEntity(
            entity,
            annotationTeam
          );
          updateAnnotations(entity, organizationId, {
            teamId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404 && entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_TEAM_AUTO_IMPORT]) {
          try {
            await rootlyClient.importTeamEntity(entity);
          } catch (importError) {
            if (importError instanceof Error) {
              this.logger.error(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`
          );
        }
      }
    }
    return entity;
  }
  async processRootlyCatalogEntity(rootlyClient, organizationId, entity, location, emit) {
    const entityTriplet = catalogModel.stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name
    });
    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);
    try {
      const catalogEntityIdAnnotation = this.catalogEntityIdAnnotations(entity);
      if (catalogEntityIdAnnotation) {
        const annotationCatalogEntityResponse = await rootlyClient.getCatalogEntity(catalogEntityIdAnnotation);
        const annotationCatalogEntity = annotationCatalogEntityResponse.data;
        if (annotationCatalogEntity.attributes.backstage_id && annotationCatalogEntity.attributes.backstage_id !== entityTriplet) {
          const response = await rootlyClient.updateCatalogEntityEntity(
            entity,
            annotationCatalogEntity
          );
          updateAnnotations(entity, organizationId, {
            catalogEntityId: response.data.id
          });
        } else {
          const response = await rootlyClient.updateCatalogEntityEntity(
            entity,
            annotationCatalogEntity
          );
          updateAnnotations(entity, organizationId, {
            catalogEntityId: response.data.id
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.cause.status === 404 && entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ENTITY_AUTO_IMPORT]) {
          const catalogId = entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ID] || entity.metadata.annotations?.[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_SLUG];
          if (catalogId) {
            try {
              await rootlyClient.importCatalogEntityEntity(
                entity,
                catalogId
              );
            } catch (importError) {
              if (importError instanceof Error) {
                this.logger.error(
                  `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`
                );
              }
            }
          } else {
            this.logger.warn(
              `[ROOTLY PLUGIN] Cannot auto-import catalog entity ${entityTriplet}: missing rootly.com/catalog-id or rootly.com/catalog-slug annotation`
            );
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`
          );
        }
      }
    }
    return entity;
  }
}
function updateAnnotations(entity, organizationId, annotations) {
  if (organizationId) {
    entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_ORG_ID] = organizationId;
  } else {
    delete entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_ORG_ID];
  }
  if (annotations.serviceId && annotations.serviceId !== "") {
    entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_SERVICE_ID] = annotations.serviceId;
  } else {
    delete entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_SERVICE_ID];
  }
  if (annotations.functionalityId && annotations.functionalityId !== "") {
    entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_FUNCTIONALITY_ID] = annotations.functionalityId;
  } else {
    delete entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_FUNCTIONALITY_ID];
  }
  if (annotations.teamId && annotations.teamId !== "") {
    entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_TEAM_ID] = annotations.teamId;
  } else {
    delete entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_TEAM_ID];
  }
  if (annotations.catalogEntityId && annotations.catalogEntityId !== "") {
    entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ENTITY_ID] = annotations.catalogEntityId;
  } else {
    delete entity.metadata.annotations[backstagePluginCommon.ROOTLY_ANNOTATION_CATALOG_ENTITY_ID];
  }
}

exports.RootlyEntityProcessor = RootlyEntityProcessor;
//# sourceMappingURL=RootlyEntityProcessor.cjs.js.map
