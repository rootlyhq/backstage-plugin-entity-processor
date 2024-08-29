import { AuthService, DiscoveryService, LoggerService, RootConfigService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogProcessor, CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { RootlyApi } from '@rootly/backstage-plugin-common';
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
export declare class RootlyEntityProcessor implements CatalogProcessor {
    private logger;
    private auth;
    private discovery;
    private config;
    private shouldProcessEntity;
    private serviceIdAnnotations;
    private functionalityIdAnnotations;
    private teamIdAnnotations;
    constructor({ auth, discovery, config, logger }: RootlyEntityProcessorOptions);
    useRootlyClient: ({ auth, discovery, config, organizationId, }: {
        auth: AuthService;
        discovery: DiscoveryService;
        config: RootConfigService;
        organizationId?: string | undefined;
    }) => Promise<RootlyApi>;
    getProcessorName(): string;
    postProcessEntity(entity: Entity, location: LocationSpec, emit: CatalogProcessorEmit): Promise<Entity>;
    processRootlyService(rootlyClient: RootlyApi, entity: Entity, location: LocationSpec, emit: CatalogProcessorEmit): Promise<Entity>;
    processRootlyFunctionality(rootlyClient: RootlyApi, entity: Entity, location: LocationSpec, emit: CatalogProcessorEmit): Promise<Entity>;
    processRootlyTeam(rootlyClient: RootlyApi, entity: Entity, location: LocationSpec, emit: CatalogProcessorEmit): Promise<Entity>;
}
export type AnnotationUpdateProps = {
    serviceId?: string;
    functionalityId?: string;
    teamId?: string;
    pagerdutyServiceId?: string;
};
