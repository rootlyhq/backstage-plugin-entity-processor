import { RootlyEntity, RootlyIncident, RootlyService, RootlyFunctionality, RootlyTeam } from '@rootly/backstage-plugin-common';
import { AuthService, DiscoveryService } from '@backstage/backend-plugin-api';
export type RootlyServicesFetchOpts = {
    page?: {
        number?: number;
        size?: number;
    };
    filter?: object;
    include?: string;
};
export type RootlyFunctionalitiesFetchOpts = {
    page?: {
        number?: number;
        size?: number;
    };
    filter?: object;
    include?: string;
};
export type RootlyTeamsFetchOpts = {
    page?: {
        number?: number;
        size?: number;
    };
    filter?: object;
    include?: string;
};
export type RootlyIncidentsFetchOpts = {
    page?: {
        number?: number;
        size?: number;
    };
    filter?: object;
    include?: string;
};
export interface Rootly {
    getService(id_or_slug: String): Promise<RootlyServiceResponse>;
    getServices(opts?: RootlyServicesFetchOpts): Promise<RootlyServicesResponse>;
    getFunctionality(id_or_slug: String): Promise<RootlyFunctionalityResponse>;
    getFunctionalities(opts?: RootlyFunctionalitiesFetchOpts): Promise<RootlyFunctionalitiesResponse>;
    getTeam(id_or_slug: String): Promise<RootlyTeamResponse>;
    getTeams(opts?: RootlyTeamsFetchOpts): Promise<RootlyTeamsResponse>;
    getIncidents(opts?: RootlyIncidentsFetchOpts): Promise<RootlyIncidentsResponse>;
    importServiceEntity(entity: RootlyEntity): Promise<void>;
    updateServiceEntity(entity: RootlyEntity, service: RootlyService, old_service?: RootlyService): Promise<void>;
    deleteServiceEntity(service: RootlyService): Promise<void>;
    importFunctionalityEntity(entity: RootlyEntity): Promise<void>;
    updateFunctionalityEntity(entity: RootlyEntity, functionality: RootlyFunctionality, old_functionality?: RootlyFunctionality): Promise<void>;
    deleteFunctionalityEntity(functionality: RootlyFunctionality): Promise<void>;
    importTeamEntity(entity: RootlyEntity): Promise<void>;
    updateTeamEntity(entity: RootlyEntity, functionality: RootlyTeam, old_functionality?: RootlyTeam): Promise<void>;
    deleteTeamEntity(team: RootlyTeam): Promise<void>;
}
export interface RootlyServiceResponse {
    data: RootlyService;
}
export interface RootlyServicesResponse {
    meta: {
        total_count: number;
        total_pages: number;
    };
    data: RootlyService[];
}
export interface RootlyFunctionalityResponse {
    data: RootlyFunctionality;
}
export interface RootlyFunctionalitiesResponse {
    meta: {
        total_count: number;
        total_pages: number;
    };
    data: RootlyFunctionality[];
}
export interface RootlyTeamResponse {
    data: RootlyTeam;
}
export interface RootlyTeamsResponse {
    meta: {
        total_count: number;
        total_pages: number;
    };
    data: RootlyTeam[];
}
export interface RootlyIncidentsResponse {
    meta: {
        total_count: number;
        total_pages: number;
    };
    data: RootlyIncident[];
    included: object[];
    links: {
        first: string;
        last: string;
        next?: string;
        prev?: string;
        self: string;
    };
}
type Options = {
    discovery: DiscoveryService;
    auth: AuthService;
};
/**
 * API to talk to Rootly.
 */
export declare class RootlyApi {
    private readonly discovery;
    private readonly auth;
    constructor(opts: Options);
    private fetch;
    private call;
    getService(id_or_slug: String): Promise<RootlyServiceResponse>;
    getServices(opts?: RootlyServicesFetchOpts): Promise<RootlyServicesResponse>;
    getFunctionality(id_or_slug: String): Promise<RootlyFunctionalityResponse>;
    getFunctionalities(opts?: RootlyFunctionalitiesFetchOpts): Promise<RootlyFunctionalitiesResponse>;
    getTeam(id_or_slug: String): Promise<RootlyTeamResponse>;
    getTeams(opts?: RootlyTeamsFetchOpts): Promise<RootlyTeamsResponse>;
    getIncidents(opts?: RootlyIncidentsFetchOpts): Promise<RootlyIncidentsResponse>;
    importServiceEntity(entity: RootlyEntity): Promise<void>;
    updateServiceEntity(entity: RootlyEntity, service: RootlyService, old_service?: RootlyService): Promise<void>;
    deleteServiceEntity(service: RootlyService): Promise<void>;
    importFunctionalityEntity(entity: RootlyEntity): Promise<void>;
    updateFunctionalityEntity(entity: RootlyEntity, functionality: RootlyFunctionality, old_functionality?: RootlyFunctionality): Promise<void>;
    deleteFunctionalityEntity(functionality: RootlyFunctionality): Promise<void>;
    importTeamEntity(entity: RootlyEntity): Promise<void>;
    updateTeamEntity(entity: RootlyEntity, team: RootlyTeam, old_team?: RootlyTeam): Promise<void>;
    deleteTeamEntity(team: RootlyTeam): Promise<void>;
    private apiUrl;
    private addAuthHeaders;
}
export {};
