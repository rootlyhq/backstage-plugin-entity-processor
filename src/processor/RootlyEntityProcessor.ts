import {
  AuthService,
  DiscoveryService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  ROOTLY_ANNOTATION_FUNCTIONALITY_AUTO_IMPORT,
  ROOTLY_ANNOTATION_FUNCTIONALITY_ID,
  ROOTLY_ANNOTATION_FUNCTIONALITY_SLUG,
  ROOTLY_ANNOTATION_ORG_ID,
  ROOTLY_ANNOTATION_SERVICE_AUTO_IMPORT,
  ROOTLY_ANNOTATION_TEAM_AUTO_IMPORT,
  ROOTLY_ANNOTATION_TEAM_ID,
  ROOTLY_ANNOTATION_TEAM_SLUG,
  RootlyApi,
} from '@rootly/backstage-plugin-common';
import {
  ROOTLY_ANNOTATION_SERVICE_ID,
  ROOTLY_ANNOTATION_SERVICE_SLUG,
  RootlyEntity,
} from '@rootly/backstage-plugin-common';

/**
 * A function which given an entity, determines if it should be processed for linguist tags.
 * @public
 */
export type ShouldProcessEntity = (entity: Entity) => boolean;

export interface RootlyEntityProcessorOptions {
  logger: LoggerService;
  auth: AuthService;
  discovery: DiscoveryService;
  config: RootConfigService;
}

export class RootlyEntityProcessor implements CatalogProcessor {
  private logger: LoggerService;
  private auth: AuthService;
  private discovery: DiscoveryService;
  private config: RootConfigService;

  private shouldProcessEntity: ShouldProcessEntity = (entity: Entity) => {
    return (
      (this.serviceIdAnnotations(entity) ||
        this.functionalityIdAnnotations(entity) ||
        this.teamIdAnnotations(entity)) !== undefined
    );
  };

  private serviceIdAnnotations: (entity: Entity) => string | undefined = (
    entity: Entity,
  ) => {
    return (
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_SERVICE_ID] ||
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_SERVICE_SLUG]
    );
  };

  private functionalityIdAnnotations: (entity: Entity) => string | undefined = (
    entity: Entity,
  ) => {
    return (
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_FUNCTIONALITY_ID] ||
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_FUNCTIONALITY_SLUG]
    );
  };

  private teamIdAnnotations: (entity: Entity) => string | undefined = (
    entity: Entity,
  ) => {
    return (
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_TEAM_ID] ||
      entity.metadata.annotations?.[ROOTLY_ANNOTATION_TEAM_SLUG]
    );
  };

  constructor({
    auth,
    discovery,
    config,
    logger,
  }: RootlyEntityProcessorOptions) {
    this.logger = logger;
    this.auth = auth;
    this.discovery = discovery;
    this.config = config;
    console.log('RootlyEntityProcessor initialized');
  }

  useRootlyClient = async ({
    auth,
    discovery,
    config,
    organizationId,
  }: {
    auth: AuthService;
    discovery: DiscoveryService;
    config: RootConfigService;
    organizationId?: string;
  }) => {
    const configKeys = config.getConfig('rootly').keys();

    let apiProxyPath = config.getOptionalString(
      `rootly.${configKeys.at(0)}.proxyPath`,
    );

    if (organizationId) {
      apiProxyPath = config.getOptionalString(
        `rootly.${organizationId}.proxyPath`,
      );
    } else if (configKeys.length > 1) {
      let defaultOrgId = config.getConfig('rootly').keys().at(0);
      for (const orgId of config.getConfig('rootly').keys()) {
        if (config.getOptionalBoolean(`rootly.${orgId}.isDefault`)) {
          defaultOrgId = orgId;
          break;
        }
      }
      apiProxyPath = config.getOptionalString(
        `rootly.${defaultOrgId}.proxyPath`,
      );
    }

    const token = auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'proxy', // e.g. 'catalog'
    });

    const client = new RootlyApi({
      apiProxyUrl: discovery.getBaseUrl('proxy'),
      apiProxyPath: apiProxyPath,
      apiToken: token,
    });
    return client;
  };

  getProcessorName(): string {
    return 'RootlyEntityProcessor';
  }

  async postProcessEntity(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    if (this.shouldProcessEntity(entity)) {
      const organizationId =
        entity.metadata.annotations?.[ROOTLY_ANNOTATION_ORG_ID];
      const rootlyClient = await this.useRootlyClient({
        auth: this.auth,
        discovery: this.discovery,
        config: this.config,
        organizationId: organizationId,
      });
      if (this.serviceIdAnnotations(entity)) {
        return this.processRootlyService(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit,
        );
      } else if (this.functionalityIdAnnotations(entity)) {
        return this.processRootlyFunctionality(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit,
        );
      } else if (this.teamIdAnnotations(entity)) {
        return this.processRootlyTeam(
          rootlyClient,
          organizationId,
          entity,
          location,
          emit,
        );
      }
    }
    return entity;
  }

  async processRootlyService(
    rootlyClient: RootlyApi,
    organizationId: string | undefined,
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const entityTriplet = stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name,
    });

    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);

    try {
      const serviceIdAnnotation = this.serviceIdAnnotations(entity);
      if (serviceIdAnnotation) {
        const annotationServiceResponse = await rootlyClient.getService(
          serviceIdAnnotation,
        );
        const annotationService = annotationServiceResponse.data;

        if (
          annotationService.attributes.backstage_id &&
          annotationService.attributes.backstage_id !== entityTriplet
        ) {
          const servicesResponse = await rootlyClient.getServices({
            filter: {
              backstage_id: annotationService.attributes.backstage_id,
            },
          });
          const service =
            servicesResponse &&
            servicesResponse.data &&
            servicesResponse.data.length > 0
              ? servicesResponse.data[0]
              : null;
          if (service) {
            const response = await rootlyClient.updateServiceEntity(
              entity as RootlyEntity,
              annotationService,
              service,
            );
            updateAnnotations(entity, organizationId, {
              serviceId: response.data.id,
            });
          }
        } else {
          const response = await rootlyClient.updateServiceEntity(
            entity as RootlyEntity,
            annotationService,
          );
          updateAnnotations(entity, organizationId, {
            serviceId: response.data.id,
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          (error.cause as any).status === 404 &&
          entity.metadata.annotations?.[ROOTLY_ANNOTATION_SERVICE_AUTO_IMPORT]
        ) {
          try {
            rootlyClient.importServiceEntity(entity as RootlyEntity);
          } catch (importError: unknown) {
            if (importError instanceof Error) {
              this.logger.debug(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`,
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`,
          );
        }
      }
    }

    return entity;
  }

  async processRootlyFunctionality(
    rootlyClient: RootlyApi,
    organizationId: string | undefined,
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const entityTriplet = stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name,
    });

    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);

    try {
      const functionalityIdAnnotation = this.functionalityIdAnnotations(entity);
      if (functionalityIdAnnotation) {
        const annotationFunctionalityResponse =
          await rootlyClient.getFunctionality(functionalityIdAnnotation);
        const annotationFunctionality = annotationFunctionalityResponse.data;

        if (
          annotationFunctionality.attributes.backstage_id &&
          annotationFunctionality.attributes.backstage_id !== entityTriplet
        ) {
          const functionalitiesResponse = await rootlyClient.getFunctionalities(
            {
              filter: {
                backstage_id: annotationFunctionality.attributes.backstage_id,
              },
            },
          );
          const functionality =
            functionalitiesResponse &&
            functionalitiesResponse.data &&
            functionalitiesResponse.data.length > 0
              ? functionalitiesResponse.data[0]
              : null;
          if (functionality) {
            const response = await rootlyClient.updateFunctionalityEntity(
              entity as RootlyEntity,
              annotationFunctionality,
              functionality,
            );
            updateAnnotations(entity, organizationId, {
              functionalityId: response.data.id,
            });
          }
        } else {
          const response = await rootlyClient.updateFunctionalityEntity(
            entity as RootlyEntity,
            annotationFunctionality,
          );
          updateAnnotations(entity, organizationId, {
            functionalityId: response.data.id,
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          (error.cause as any).status === 404 &&
          entity.metadata.annotations?.[
            ROOTLY_ANNOTATION_FUNCTIONALITY_AUTO_IMPORT
          ]
        ) {
          try {
            rootlyClient.importFunctionalityEntity(entity as RootlyEntity);
          } catch (importError: unknown) {
            if (importError instanceof Error) {
              this.logger.debug(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`,
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`,
          );
        }
      }
    }

    return entity;
  }

  async processRootlyTeam(
    rootlyClient: RootlyApi,
    organizationId: string | undefined,
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const entityTriplet = stringifyEntityRef({
      namespace: entity.metadata.namespace,
      kind: entity.kind,
      name: entity.metadata.name,
    });

    this.logger.debug(`[ROOTLY PLUGIN] Processing entity ${entityTriplet}`);

    try {
      const teamIdAnnotation = this.teamIdAnnotations(entity);
      if (teamIdAnnotation) {
        const annotationTeamResponse = await rootlyClient.getTeam(
          teamIdAnnotation,
        );
        const annotationTeam = annotationTeamResponse.data;

        if (
          annotationTeam.attributes.backstage_id &&
          annotationTeam.attributes.backstage_id !== entityTriplet
        ) {
          const teamsResponse = await rootlyClient.getTeams({
            filter: {
              backstage_id: annotationTeam.attributes.backstage_id,
            },
          });
          const team =
            teamsResponse && teamsResponse.data && teamsResponse.data.length > 0
              ? teamsResponse.data[0]
              : null;
          if (team) {
            const response = await rootlyClient.updateTeamEntity(
              entity as RootlyEntity,
              annotationTeam,
              team,
            );
            updateAnnotations(entity, organizationId, {
              teamId: response.data.id,
            });
          }
        } else {
          const response = await rootlyClient.updateTeamEntity(
            entity as RootlyEntity,
            annotationTeam,
          );
          updateAnnotations(entity, organizationId, {
            teamId: response.data.id,
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          (error.cause as any).status === 404 &&
          entity.metadata.annotations?.[ROOTLY_ANNOTATION_TEAM_AUTO_IMPORT]
        ) {
          try {
            rootlyClient.importTeamEntity(entity as RootlyEntity);
          } catch (importError: unknown) {
            if (importError instanceof Error) {
              this.logger.debug(
                `[ROOTLY PLUGIN] Error Importing entity ${entityTriplet}: ${importError.message}`,
              );
            }
          }
        } else {
          this.logger.error(
            `[ROOTLY PLUGIN] Error processing entity ${entityTriplet}: ${error.toString()}`,
          );
        }
      }
    }

    return entity;
  }
}

export type AnnotationUpdateProps = {
  serviceId?: string;
  functionalityId?: string;
  teamId?: string;
  pagerdutyServiceId?: string;
};

function updateAnnotations(
  entity: Entity,
  organizationId: string | undefined,
  annotations: AnnotationUpdateProps,
): void {
  // If organizationId is present, add the annotations to the entity
  if (organizationId) {
    entity.metadata.annotations![ROOTLY_ANNOTATION_ORG_ID] = organizationId;
  } else {
    delete entity.metadata.annotations![ROOTLY_ANNOTATION_ORG_ID];
  }

  // If serviceId is present, add the annotations to the entity
  if (annotations.serviceId && annotations.serviceId !== '') {
    entity.metadata.annotations![ROOTLY_ANNOTATION_SERVICE_ID] =
      annotations.serviceId;
  } else {
    delete entity.metadata.annotations![ROOTLY_ANNOTATION_SERVICE_ID];
  }

  // If functionalityId is present, add the annotations to the entity
  if (annotations.functionalityId && annotations.functionalityId !== '') {
    entity.metadata.annotations![ROOTLY_ANNOTATION_FUNCTIONALITY_ID] =
      annotations.functionalityId;
  } else {
    delete entity.metadata.annotations![ROOTLY_ANNOTATION_FUNCTIONALITY_ID];
  }

  // If teamId is present, add the annotations to the entity
  if (annotations.teamId && annotations.teamId !== '') {
    entity.metadata.annotations![ROOTLY_ANNOTATION_TEAM_ID] =
      annotations.teamId;
  } else {
    delete entity.metadata.annotations![ROOTLY_ANNOTATION_TEAM_ID];
  }
}
