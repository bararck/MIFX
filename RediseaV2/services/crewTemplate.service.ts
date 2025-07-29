import { ApiClient } from '../utils/api.client';
import {
  CrewTemplateRequest,
  CrewTemplateResponse,
  CrewTemplateListCollectionResponse,
  ApiResponse,
  TestResponse
} from '../types/api.types';

export class CrewTemplateService {
  constructor(private apiClient: ApiClient) {}

  async createTemplate(data: CrewTemplateRequest): Promise<TestResponse<ApiResponse<{ message: string }>>> {
    const res = await this.apiClient.post<{ message: string }>('/v1/crew/template', data);
    return {
      status: res.status,
      body: res.body,
    };
  }

  async updateTemplate(data: CrewTemplateRequest): Promise<TestResponse<ApiResponse<{ message: string }>>> {
    const res = await this.apiClient.put<{ message: string }>('/v1/crew/template', data);
    return {
      status: res.status,
      body: res.body,
    };
  }

  async deleteTemplate(templateId: string): Promise<TestResponse<ApiResponse<{ message: string }>>> {
    const res = await this.apiClient.delete<{ message: string }>(`/v1/crew/template?id=${templateId}`);
    return {
      status: res.status,
      body: res.body,
    };
  }

  async getTemplateById(templateId: string): Promise<TestResponse<ApiResponse<CrewTemplateResponse>>> {
    const res = await this.apiClient.get<ApiResponse<CrewTemplateResponse>>(`/v1/crew/template/${templateId}`);
    return {
      status: res.status,
      body: res.body,
    };
  }

  async getTemplates(page = 1, limit = 10): Promise<TestResponse<ApiResponse<CrewTemplateListCollectionResponse>>> {
    const res = await this.apiClient.get<ApiResponse<CrewTemplateListCollectionResponse>>(`/v1/crew/template?page=${page}&limit=${limit}`);
    return {
      status: res.status,
      body: res.body,
    };
  }
}
