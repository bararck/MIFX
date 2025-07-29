import { ApiClient } from '../utils/api.client';
import { TestConfig } from '../utils/test.config';
import { 
  CrewComponentRequest, 
  CrewComponentResponse, 
  CrewComponentCategory, 
  CrewComponentGroup,
  ApiResponse,
  PaginatedApiResponse
} from '../types/api.types';

export class CrewService {
  constructor(private apiClient: ApiClient) {}

  async updateCrewComponents(data: CrewComponentRequest): Promise<{
    status: number;
    body: CrewComponentResponse;
    headers: Record<string, string>;
  }> {
    try {
      return await this.apiClient.patch<CrewComponentResponse>(
        TestConfig.API_ENDPOINTS.CREW.COMPONENT, 
        data
      );
    } catch (error) {
      console.error('Error updating crew components:', error);
      throw error;
    }
  }

  /**
   * Get all crew components by category using query parameter
   * GET /v1/crew/component?category=Profile
   * This matches your working cURL request
   */
  async getAllCrewComponentsByCategory(category: CrewComponentCategory): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    try {
      const categoryValues = Object.values(CrewComponentCategory) as string[];
      if (!categoryValues.includes(category as string)) {
        throw new Error(`Invalid category: ${category}. Valid categories are: ${categoryValues.join(', ')}`);
      }

      // Use query parameter instead of path parameter to match your working cURL
      const queryParams = new URLSearchParams({
        category: category
      });

      const endpoint = `${TestConfig.API_ENDPOINTS.CREW.COMPONENT}?${queryParams.toString()}`;

      return await this.apiClient.get<ApiResponse<CrewComponentGroup[]>>(endpoint);
    } catch (error) {
      console.error(`Error getting all crew components for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get crew components by category with pagination
   * GET /v1/crew/component?category=Profile&page=1&limit=10
   */
  async getCrewComponentsByCategory(
    category: CrewComponentCategory,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    status: number;
    body: PaginatedApiResponse<CrewComponentGroup>;
    headers: Record<string, string>;
  }> {
    try {
      const categoryValues = Object.values(CrewComponentCategory) as string[];
      if (!categoryValues.includes(category as string)) {
        throw new Error(`Invalid category: ${category}. Valid categories are: ${categoryValues.join(', ')}`);
      }

      if (page < 1) {
        throw new Error('Page number must be greater than 0');
      }
      if (limit < 1) {
        throw new Error('Limit must be greater than 0');
      }

      const queryParams = new URLSearchParams({
        category: category,
        page: page.toString(),
        limit: limit.toString()
      });

      const endpoint = `${TestConfig.API_ENDPOINTS.CREW.COMPONENT}?${queryParams.toString()}`;

      return await this.apiClient.get<PaginatedApiResponse<CrewComponentGroup>>(endpoint);
    } catch (error) {
      console.error(`Error getting crew components for category ${category}:`, error);
      throw error;
    }
  }

  // Helper methods for each category - all using the corrected endpoint pattern
  async getProfileComponents(): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    return this.getAllCrewComponentsByCategory(CrewComponentCategory.PROFILE);
  }

  async getLegalIdentityComponents(): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    return this.getAllCrewComponentsByCategory(CrewComponentCategory.LEGAL_IDENTITY);
  }

  async getCertificateComponents(): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    return this.getAllCrewComponentsByCategory(CrewComponentCategory.CERTIFICATE);
  }

  async getDocumentComponents(): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    return this.getAllCrewComponentsByCategory(CrewComponentCategory.DOCUMENT);
  }

  async getOtherComponents(): Promise<{
    status: number;
    body: ApiResponse<CrewComponentGroup[]>;
    headers: Record<string, string>;
  }> {
    return this.getAllCrewComponentsByCategory(CrewComponentCategory.OTHER);
  }

  /**
   * Debug method to check what endpoint is being called
   */
  getEndpointUrl(category: CrewComponentCategory): string {
    const queryParams = new URLSearchParams({
      category: category
    });
    return `${TestConfig.API_ENDPOINTS.CREW.COMPONENT}?${queryParams.toString()}`;
  }
}