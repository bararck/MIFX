import { 
  Stakeholder, 
  CreateStakeholderRequest, 
  UpdateStakeholderRequest,
  CreateStakeholderResponse,
  UpdateStakeholderResponse,
  GetStakeholdersResponse,
  GetStakeholderResponse,
  DeleteStakeholderResponse
} from '../types/api.types';
import { ApiClient } from '../utils/api.client';

export class StakeholderService {
  constructor(private apiClient: ApiClient) {}

  async createStakeholder(data: CreateStakeholderRequest) {
    return await this.apiClient.post<CreateStakeholderResponse>('/v1/admin/stakeholder', data);
  }

  async updateStakeholder(data: UpdateStakeholderRequest) {
    return await this.apiClient.patch<UpdateStakeholderResponse>('/v1/admin/stakeholder', data);
  }

  async getStakeholders(page: number = 1, limit: number = 10) {
    return await this.apiClient.get<GetStakeholdersResponse>(`/v1/stakeholder?page=${page}&limit=${limit}`);
  }

  async deleteStakeholder(id: string) {
    return await this.apiClient.delete<DeleteStakeholderResponse>(`/v1/admin/stakeholder/${id}`);
  }

  async getStakeholder(id: string) {
    return await this.apiClient.get<GetStakeholderResponse>(`/v1/stakeholder/${id}`);
  }
}