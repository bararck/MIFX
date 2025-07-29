import { ApiClient } from "../utils/api.client";
import { ApiResponse, ServiceResponse, VesselTypeRequest,VesselResponse,VesselPaginatedResponse, VesselTypeResponse, VesselRequest } from '../types/api.types';

export class VesselService {
  getShipowners() {
    throw new Error('Method not implemented.');
  } 
    constructor(private apiClient: ApiClient){}

    // Vessel Type
    async createOrUpdateVesselTypes (
        data: VesselTypeRequest []
    ): Promise<ServiceResponse<ApiResponse>> {
        const res = await this.apiClient.put<ApiResponse>('/v1/vessel/type',{data});
        return res
    }

    async getVesselTypes () : Promise<ServiceResponse<ApiResponse<VesselTypeResponse[]>>> {
        const res = await this.apiClient.get<ApiResponse<VesselTypeResponse[]>>('/v1/vessel/type');
        return res;
    }

    // Vessel
        async createOrUpdateVessels(data: VesselRequest[]): Promise<ServiceResponse<ApiResponse>> {
        const res = await this.apiClient.put<ApiResponse>('/v1/vessel', { data });
        return res;
    }

    async getVessels (): Promise<ServiceResponse<ApiResponse<VesselResponse[]>>> {
        const res = await this.apiClient.get<ApiResponse<VesselResponse[]>>('/v1/vessel');
        return res;
    }

    async getVesselsWithPagination(
        page: number = 1,
        limit: number = 10
    ): Promise<ServiceResponse<VesselPaginatedResponse>> {
        const res = await this.apiClient.get<VesselPaginatedResponse>(
         `/v1/vessel?page=${page}&limit=${limit}`
        );
        return res;
    }
}