import { test, expect } from '../../fixtures/api.fixture';
import { request } from '@playwright/test';
import { CrewTemplateRequest } from '../../types/api.types';
import { ApiAssertions } from '../../utils/assertions';
import { TestDataGenerator } from '../../utils/test.data';
import { v4 as uuidv4 } from 'uuid';

test.describe('Crew Template Management @crewTemplate', () => {
  let baseTemplate: CrewTemplateRequest;
  let validCredentials;
  let createdTemplateId: string;

  test.beforeEach(async ({ authService }) => {
    // Validate credentials before each test
    validCredentials = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'sayang1234',
      bypassCaptcha: process.env.RECAPTCHA_BYPASS === 'true' || true
    };

    // Initialize base template
    baseTemplate = {
      templateName: `Template QA ${Date.now()}`,
      profile: [
        {
          groupId: uuidv4(),
          isActive: true,
          displayOrder: 1,
          components: [
            {
              componentId: uuidv4(),
              isMandatory: true,
              isActive: true,
              displayOrder: 1,
            },
          ],
        },
      ],
      legalIdentity: [],
      certificate: [],
      document: [],
      other: [],
    };

    // Authenticate before each test
    const loginResponse = await authService.login(validCredentials);
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', loginResponse.body);
    
    if (loginResponse.status !== 200) {
      console.log('Login failed with status:', loginResponse.status);
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    ApiAssertions.expectSuccessResponse(loginResponse);
  });

  test('should create template successfully with valid data', async ({ crewTemplateService }) => {
    const response = await crewTemplateService.createTemplate(baseTemplate);
    
    console.log('Create template response status:', response.status);
    console.log('Create template response body:', response.body);
    
    ApiAssertions.expectSuccessResponse(response, 201);
    
    // Verify template was created by fetching list
    const list = await crewTemplateService.getTemplates();
    ApiAssertions.expectSuccessResponse(list);

    expect(list.body.items).toBeDefined();
    // Type assertion for template list items
    const items = list.body.items as any[];
    const found = items?.find(
      (t: any) => t.templateName === baseTemplate.templateName
    );
    expect(found).toBeDefined();
    createdTemplateId = found!.id;
  });

  test('should fail to create template with invalid data', async ({ crewTemplateService }) => {
    const invalidTemplate: CrewTemplateRequest = {
      ...baseTemplate,
      templateName: '', // Empty template name
    };

    const response = await crewTemplateService.createTemplate(invalidTemplate);
    
    console.log('Invalid template response status:', response.status);
    console.log('Invalid template response body:', response.body);
    
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    
    // Handle different response structures
    if (response.body && typeof response.body === 'object' && 'message' in response.body) {
      expect((response.body as any).message).toMatch(/validation|required|empty/i);
    }
  });

  test('should fail to create template without authentication', async () => {
    const context = await request.newContext();
    const response = await context.post(`${process.env.BASE_URL}/v1/crew/template`, {
      data: baseTemplate,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toMatch(/unauthorized|invalid|token/i);
  });

  // Helper function to ensure template creation and return template ID
  async function createTestTemplate(crewTemplateService) {
    const createResponse = await crewTemplateService.createTemplate(baseTemplate);
    
    if (createResponse.status !== 201) {
      console.log('Template creation failed with status:', createResponse.status);
      console.log('Template creation response body:', createResponse.body);
      throw new Error(`Template creation failed with status ${createResponse.status}: ${JSON.stringify(createResponse.body)}`);
    }
    
    const list = await crewTemplateService.getTemplates();
    if (!list.body.items) {
      throw new Error('Template list is undefined');
    }
    
    // Type assertion for template list items
    const items = list.body.items as any[];
    const found = items.find(
      (t: any) => t.templateName === baseTemplate.templateName
    );
    
    if (!found) {
      throw new Error('Created template not found in template list');
    }
    
    return found.id;
  }

  test('should retrieve template by ID successfully', async ({ crewTemplateService }) => {
    try {
      // Create template first
      const templateId = await createTestTemplate(crewTemplateService);
      
      // Retrieve by ID
      const response = await crewTemplateService.getTemplateById(templateId);
      
      console.log('Get template response status:', response.status);
      console.log('Get template response body:', response.body);
      
      ApiAssertions.expectSuccessResponse(response);
      expect(response.body).toBeDefined();
      
      // Type assertion for template response
      const templateData = response.body as any;
      expect(templateData.id).toBe(templateId);
      
    } catch (error) {
      console.error('Test failed with error:', error.message);
      throw error;
    }
  });

  test('should update template successfully', async ({ crewTemplateService }) => {
    try {
      // Create template first
      const templateId = await createTestTemplate(crewTemplateService);
      
      // Get template details to get existing IDs
      const detail = await crewTemplateService.getTemplateById(templateId);
      ApiAssertions.expectSuccessResponse(detail);
      
      // Type assertion for template response
      const templateData = detail.body as any;
      
      if (!templateData.profile || !Array.isArray(templateData.profile) || templateData.profile.length === 0) {
        throw new Error('Template structure is invalid - missing profile data');
      }
      
      const profileItem = templateData.profile[0];
      if (!profileItem.components || !Array.isArray(profileItem.components) || profileItem.components.length === 0) {
        throw new Error('Template structure is invalid - missing components data');
      }
      
      const groupId = profileItem.id;
      const componentId = profileItem.components[0].id;

      const updatePayload: CrewTemplateRequest = {
        ...baseTemplate,
        templateName: `Updated ${baseTemplate.templateName}`,
        profile: [
          {
            id: groupId,
            groupId: uuidv4(),
            isActive: true,
            displayOrder: 2,
            components: [
              {
                id: componentId,
                componentId: uuidv4(),
                isMandatory: false,
                isActive: true,
                displayOrder: 1,
              },
            ],
          },
        ],
      };

      const response = await crewTemplateService.updateTemplate(updatePayload);
      
      console.log('Update template response status:', response.status);
      console.log('Update template response body:', response.body);
      
      ApiAssertions.expectSuccessResponse(response, 200);
      
    } catch (error) {
      console.error('Test failed with error:', error.message);
      throw error;
    }
  });

  test('should delete template successfully', async ({ crewTemplateService }) => {
    try {
      // Create template first
      const templateId = await createTestTemplate(crewTemplateService);
      
      // Delete the template
      const response = await crewTemplateService.deleteTemplate(templateId);
      
      console.log('Delete template response status:', response.status);
      console.log('Delete template response body:', response.body);
      
      ApiAssertions.expectSuccessResponse(response, 200);
      
      // Verify template was deleted by trying to retrieve it
      const getResponse = await crewTemplateService.getTemplateById(templateId);
      expect([404, 400]).toContain(getResponse.status);
      
    } catch (error) {
      console.error('Test failed with error:', error.message);
      throw error;
    }
  });

  test('should fail to retrieve non-existent template', async ({ crewTemplateService }) => {
    const nonExistentId = 'non-existent-id';
    
    const response = await crewTemplateService.getTemplateById(nonExistentId);
    
    console.log('Get non-existent template response status:', response.status);
    console.log('Get non-existent template response body:', response.body);
    
    expect([404, 400]).toContain(response.status);
    
    // Handle different response structures
    if (response.body && typeof response.body === 'object' && 'message' in response.body) {
      expect((response.body as any).message).toMatch(/not found|template|invalid/i);
    }
  });

  test('should fail to update non-existent template', async ({ crewTemplateService }) => {
    const updatePayload: CrewTemplateRequest = {
      ...baseTemplate,
      templateName: 'Non-existent template update',
    };

    const response = await crewTemplateService.updateTemplate(updatePayload);
    
    console.log('Update non-existent template response status:', response.status);
    console.log('Update non-existent template response body:', response.body);
    
    expect([404, 400]).toContain(response.status);
    
    // Handle different response structures
    if (response.body && typeof response.body === 'object' && 'message' in response.body) {
      expect((response.body as any).message).toMatch(/not found|template|invalid/i);
    }
  });

  test('should fail to delete non-existent template', async ({ crewTemplateService }) => {
    const nonExistentId = 'non-existent-id';
    
    const response = await crewTemplateService.deleteTemplate(nonExistentId);
    
    console.log('Delete non-existent template response status:', response.status);
    console.log('Delete non-existent template response body:', response.body);
    
    expect([404, 400]).toContain(response.status);
    
    // Handle different response structures
    if (response.body && typeof response.body === 'object' && 'message' in response.body) {
      expect((response.body as any).message).toMatch(/not found|template|invalid/i);
    }
  });

  // Additional diagnostic test to help identify issues
  test('should check environment and service setup', async ({ crewTemplateService }) => {
    // Check if environment variables are set
    console.log('BASE_URL is set:', !!process.env.BASE_URL);
    console.log('TEST_EMAIL is set:', !!process.env.TEST_EMAIL);
    console.log('TEST_PASSWORD is set:', !!process.env.TEST_PASSWORD);
    console.log('RECAPTCHA_BYPASS is set:', process.env.RECAPTCHA_BYPASS);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Check service methods
    expect(crewTemplateService).toBeDefined();
    expect(typeof crewTemplateService.createTemplate).toBe('function');
    expect(typeof crewTemplateService.getTemplates).toBe('function');
    expect(typeof crewTemplateService.getTemplateById).toBe('function');
    expect(typeof crewTemplateService.updateTemplate).toBe('function');
    expect(typeof crewTemplateService.deleteTemplate).toBe('function');
    
    // Test basic functionality
    const response = await crewTemplateService.getTemplates();
    
    expect(response.status).toBeDefined();
    expect(response.body).toBeDefined();
    
    if (response.status === 200) {
      console.log('✅ Crew template service is working correctly');
    } else {
      console.log('❌ Crew template service test failed with status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
    }
  });
});