import { ApiClient } from '../utils/api.client';
import {
  RankTypeRequest,
  RankTypeResponse,
  RankClassificationRequest,
  RankClassificationResponse,
  RankRequest,
  RankResponse,
  RanksPaginatedResponse,
  ApiResponse,
  ServiceResponse,
} from '../types/api.types';

export class RankService {
  constructor(private apiClient: ApiClient) {}

  // Rank Type
  async createOrUpdateRankTypes(
    data: RankTypeRequest[]
  ): Promise<ServiceResponse<ApiResponse>> {
    const res = await this.apiClient.put<ApiResponse>('/v1/rank/type', { data });
    return res;
  }

  async getRankTypes(): Promise<ServiceResponse<ApiResponse<RankTypeResponse[]>>> {
    const res = await this.apiClient.get<ApiResponse<RankTypeResponse[]>>('/v1/rank/type');
    return res;
  }

  // Rank Classification
  async createOrUpdateRankClassifications(
    data: RankClassificationRequest[]
  ): Promise<ServiceResponse<ApiResponse>> {
    const res = await this.apiClient.put<ApiResponse>('/v1/rank/classification', { data });
    return res;
  }

  async getRankClassifications(): Promise<ServiceResponse<ApiResponse<RankClassificationResponse[]>>> {
    const res = await this.apiClient.get<ApiResponse<RankClassificationResponse[]>>('/v1/rank/classification');
    return res;
  }

  // Ranks
  async createOrUpdateRanks(data: RankRequest[]): Promise<ServiceResponse<ApiResponse>> {
    const res = await this.apiClient.put<ApiResponse>('/v1/rank', { data });
    return res;
  }

  async getAllRanks(): Promise<ServiceResponse<ApiResponse<RankResponse[]>>> {
    const res = await this.apiClient.get<ApiResponse<RankResponse[]>>('/v1/rank');
    return res;
  }

  async getRanksWithPagination(
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<RanksPaginatedResponse>> {
    const res = await this.apiClient.get<RanksPaginatedResponse>(
      `/v1/rank?page=${page}&limit=${limit}`
    );
    return res;
  }
}
