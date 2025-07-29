import { 
  Company, 
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  CompanyGroupResponse,
  UpdateCompanyGroupResponse,
  CreateCompanyResponse,
  UpdateCompanyResponse,
  GetCompaniesResponse,
  DeleteCompanyResponse,
  GetCompanyResponse,
  UpdateCompanyGroupRequest
} from '../types/api.types';
import { ApiClient } from '../utils/api.client';

export class CompanyService {
  constructor(private apiClient: ApiClient) {}

  async getCompanyGroup() {
    return await this.apiClient.get<CompanyGroupResponse>('/v1/company-group');
  }

  async updateCompanyGroup(name: string) {
    const data: UpdateCompanyGroupRequest = { name };
    return await this.apiClient.patch<UpdateCompanyGroupResponse>('/v1/admin/company-group', data);
  }

  async createCompany(data: CreateCompanyRequest) {
    return await this.apiClient.post<CreateCompanyResponse>('/v1/admin/company', data);
  }

  async updateCompany(data: UpdateCompanyRequest) {
    return await this.apiClient.patch<UpdateCompanyResponse>('/v1/admin/company', data);
  }

  async getCompanies(page: number = 1, limit: number = 10) {
    return await this.apiClient.get<GetCompaniesResponse>(`/v1/admin/company?page=${page}&limit=${limit}`);
  }

  async deleteCompany(id: string) {
    return await this.apiClient.delete<DeleteCompanyResponse>(`/v1/admin/company/${id}`);
  }

  async getCompany() {
    return await this.apiClient.get<GetCompanyResponse>('/v1/company');
  }

  // Additional methods yang mungkin diperlukan
  async getCompanyById(id: string) {
    return await this.apiClient.get<GetCompanyResponse>(`/v1/admin/company/${id}`);
  }

  async searchCompanies(query: string, page: number = 1, limit: number = 10) {
    return await this.apiClient.get<GetCompaniesResponse>(`/v1/admin/company/search?q=${query}&page=${page}&limit=${limit}`);
  }

  async toggleCompanyStatus(id: string, isActive: boolean) {
    return await this.apiClient.patch<UpdateCompanyResponse>(`/v1/admin/company/${id}/status`, { isActive });
  }
}