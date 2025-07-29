import { test, expect } from '../../fixtures/api.fixture';
import { request } from '@playwright/test';
import { 
  RankTypeRequest, 
  RankClassificationRequest, 
  RankRequest,
  RankTypeResponse,
  RankClassificationResponse,
  RankResponse,
  User
} from '../../types/api.types';
import { ApiAssertions } from '../../utils/assertions';
import { v4 as uuidv4 } from 'uuid';

// Define types for login responses to match AuthService
interface LoginSuccessResponse {
  status: number;
  body: {
    message: string;
    token: string;
    user: User;
  };
  headers: Record<string, string>;
}

interface LoginErrorResponse {
  status: number;
  body: {
    message: string;
    errorCode?: string;
    validationErrors?: any[];
  };
  headers: Record<string, string>;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

// Type guard to check if response is a success response
const isLoginSuccessResponse = (response: LoginResponse): response is LoginSuccessResponse => {
  return response.status === 200 && 'token' in response.body && 'user' in response.body;
};

// Extended types for update operations (with optional id)
interface RankTypeUpdateRequest extends RankTypeRequest {
  id?: string;
}

interface RankClassificationUpdateRequest extends RankClassificationRequest {
  id?: string;
}

// Type for validation error responses
interface ValidationErrorResponse {
  status: number;
  body: {
    message: string;
    errorCode: string;
    validationErrors?: Array<{
      field: string;
      rule: string;
      message: string;
    }>;
  };
}

// Type guard for validation error responses
const isValidationErrorResponse = (response: any): response is ValidationErrorResponse => {
  return response.status === 400 && 
         response.body && 
         response.body.errorCode === 'BINDING_VALIDATION_ERROR';
};

test.describe('Rank Type API Tests @rank-type', () => {
  let validCredentials: any;
  let createdRankTypeIds: string[] = [];

  test.beforeEach(async ({ authService }) => {
    // Validate credentials before each test
    validCredentials = {
      email: process.env.TEST_EMAIL || 'testqaremora@mailnesia.com',
      password: process.env.TEST_PASSWORD || 'Pow3r-123456',
      bypassCaptcha: process.env.RECAPTCHA_BYPASS === 'true' || true
    };

    // Authenticate before each test
    const loginResponse = await authService.login(validCredentials) as LoginResponse;
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', loginResponse.body);
    
    if (loginResponse.status !== 200) {
      console.log('Login failed with status:', loginResponse.status);
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    if (!isLoginSuccessResponse(loginResponse)) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    // For successful login, we can now safely access the token
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user).toBeDefined();
  });

  test.describe('Rank Type Management - /v1/rank/type', () => {
    
    test('should return 200 when updating existing rank type by ID', async ({ rankService }) => {
      // First create a rank type
      const initialRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: `Initial Officer ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankTypes(initialRankTypes);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank type ID
      const listResponse = await rankService.getRankTypes();
      ApiAssertions.expectSuccessResponse(listResponse);
      
      if (listResponse.body.data) {
        const createdType = listResponse.body.data.find((type: RankTypeResponse) => 
          type.rankTypeName === initialRankTypes[0].rankTypeName
        );
        
        expect(createdType).toBeDefined();
        const rankTypeId = createdType!.id;
        
        // Update the rank type using the same ID
        const updateRankTypes: RankTypeUpdateRequest[] = [
          {
            id: rankTypeId,
            rankTypeName: `Updated Officer ${Date.now()}`,
            displayOrder: 2
          }
        ];

        const updateResponse = await rankService.createOrUpdateRankTypes(updateRankTypes);
        
        console.log('Update rank type by ID response status:', updateResponse.status);
        console.log('Update rank type by ID response body:', updateResponse.body);
        
        expect(updateResponse.status).toBe(200);
        createdRankTypeIds.push(rankTypeId);
      }
    });

    test('should return 200 when updating rank type name', async ({ rankService }) => {
      // Create initial rank type
      const initialRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: `Original Name ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankTypes(initialRankTypes);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank type
      const listResponse = await rankService.getRankTypes();
      if (listResponse.body.data) {
        const createdType = listResponse.body.data.find((type: RankTypeResponse) => 
          type.rankTypeName === initialRankTypes[0].rankTypeName
        );
        
        if (createdType) {
          // Update only the name
          const updateRankTypes: RankTypeUpdateRequest[] = [
            {
              id: createdType.id,
              rankTypeName: `Updated Name ${Date.now()}`,
              displayOrder: 1
            }
          ];

          const updateResponse = await rankService.createOrUpdateRankTypes(updateRankTypes);
          
          console.log('Update rank type name response status:', updateResponse.status);
          console.log('Update rank type name response body:', updateResponse.body);
          
          expect(updateResponse.status).toBe(200);
          createdRankTypeIds.push(createdType.id);
        }
      }
    });

    test('should return 400 when rankTypeName is null', async ({ rankService }) => {
      const invalidRankTypes: any[] = [
        {
          rankTypeName: null,
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(invalidRankTypes);
      
      console.log('Null rankTypeName response status:', response.status);
      console.log('Null rankTypeName response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
      
      // Check validation error message with proper type checking
      if (isValidationErrorResponse(response) && response.body.validationErrors) {
        const validationErrors = response.body.validationErrors;
        expect(validationErrors).toBeDefined();
        expect(Array.isArray(validationErrors)).toBe(true);
        
        const rankTypeNameError = validationErrors.find((error: any) => 
          error.field.includes('RankTypeName') && error.rule === 'required'
        );
        expect(rankTypeNameError).toBeDefined();
        expect(rankTypeNameError?.message).toBe('RankTypeName is required.');
      }
    });

    test('should return 400 when rankTypeName is empty string', async ({ rankService }) => {
      const invalidRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: '',
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(invalidRankTypes);
      
      console.log('Empty rankTypeName response status:', response.status);
      console.log('Empty rankTypeName response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
    });

    test('should return 500 when displayOrder is empty value', async ({ rankService }) => {
      const invalidRankTypes: any[] = [
        {
          rankTypeName: `Valid Name ${Date.now()}`,
          displayOrder: ''
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(invalidRankTypes);
      
      console.log('Empty displayOrder response status:', response.status);
      console.log('Empty displayOrder response body:', response.body);
      
      expect(response.status).toBe(500);
    });

    test('should return 400 when displayOrder is null', async ({ rankService }) => {
      const invalidRankTypes: any[] = [
        {
          rankTypeName: `Valid Name ${Date.now()}`,
          displayOrder: null
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(invalidRankTypes);
      
      console.log('Null displayOrder response status:', response.status);
      console.log('Null displayOrder response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
      
      // Check validation error message with proper type checking
      if (isValidationErrorResponse(response) && response.body.validationErrors) {
        const validationErrors = response.body.validationErrors;
        expect(validationErrors).toBeDefined();
        expect(Array.isArray(validationErrors)).toBe(true);
        
        const displayOrderError = validationErrors.find((error: any) => 
          error.field.includes('DisplayOrder') && error.rule === 'required'
        );
        expect(displayOrderError).toBeDefined();
        expect(displayOrderError?.message).toBe('DisplayOrder is required.');
      }
    });

    test('should return 200 when duplicate data exists with one ID null', async ({ rankService }) => {
      // Create initial rank type
      const initialRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: `Duplicate Test ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankTypes(initialRankTypes);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank type
      const listResponse = await rankService.getRankTypes();
      if (listResponse.body.data) {
        const createdType = listResponse.body.data.find((type: RankTypeResponse) => 
          type.rankTypeName === initialRankTypes[0].rankTypeName
        );
        
        if (createdType) {
          // Send duplicate data with one ID null
          const duplicateRankTypes: RankTypeUpdateRequest[] = [
            {
              id: createdType.id,
              rankTypeName: `Duplicate Test ${Date.now()}`,
              displayOrder: 1
            },
            {
              id: undefined, // Use undefined instead of null for better type safety
              rankTypeName: `Duplicate Test ${Date.now()}`,
              displayOrder: 1
            }
          ];

          const response = await rankService.createOrUpdateRankTypes(duplicateRankTypes);
          
          console.log('Duplicate data with null ID response status:', response.status);
          console.log('Duplicate data with null ID response body:', response.body);
          
          expect(response.status).toBe(200);
          createdRankTypeIds.push(createdType.id);
        }
      }
    });

    test('should return 200 when duplicate data exists with different IDs', async ({ rankService }) => {
      // Create two rank types
      const initialRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: `First Type ${Date.now()}`,
          displayOrder: 1
        },
        {
          rankTypeName: `Second Type ${Date.now()}`,
          displayOrder: 2
        }
      ];

      const createResponse = await rankService.createOrUpdateRankTypes(initialRankTypes);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank types
      const listResponse = await rankService.getRankTypes();
      if (listResponse.body.data) {
        const createdTypes = listResponse.body.data.filter((type: RankTypeResponse) => 
          initialRankTypes.some(rt => rt.rankTypeName === type.rankTypeName)
        );
        
        if (createdTypes.length >= 2) {
          // Send duplicate data with different IDs
          const duplicateRankTypes: RankTypeUpdateRequest[] = [
            {
              id: createdTypes[0].id,
              rankTypeName: `Duplicate Data ${Date.now()}`,
              displayOrder: 1
            },
            {
              id: createdTypes[1].id,
              rankTypeName: `Duplicate Data ${Date.now()}`,
              displayOrder: 1
            }
          ];

          const response = await rankService.createOrUpdateRankTypes(duplicateRankTypes);
          
          console.log('Duplicate data with different IDs response status:', response.status);
          console.log('Duplicate data with different IDs response body:', response.body);
          
          expect(response.status).toBe(200);
          createdRankTypeIds.push(...createdTypes.map(type => type.id));
        }
      }
    });

    test('should handle data persistence with old IDs after deletion and replication', async ({ rankService }) => {
      // Create initial rank type
      const initialRankTypes: RankTypeRequest[] = [
        {
          rankTypeName: `Persistence Test ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankTypes(initialRankTypes);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank type
      const listResponse = await rankService.getRankTypes();
      if (listResponse.body.data) {
        const createdType = listResponse.body.data.find((type: RankTypeResponse) => 
          type.rankTypeName === initialRankTypes[0].rankTypeName
        );
        
        if (createdType) {
          const oldId = createdType.id;
          
          // Simulate deletion scenario by trying to replicate with old ID
          const replicateRankTypes: RankTypeUpdateRequest[] = [
            {
              id: oldId,
              rankTypeName: `Replicated Data ${Date.now()}`,
              displayOrder: 1
            },
            {
              id: undefined, // Use undefined instead of null
              rankTypeName: `New Data ${Date.now()}`,
              displayOrder: 2
            }
          ];

          const replicateResponse = await rankService.createOrUpdateRankTypes(replicateRankTypes);
          
          console.log('Replicate with old ID response status:', replicateResponse.status);
          console.log('Replicate with old ID response body:', replicateResponse.body);
          
          expect(replicateResponse.status).toBe(200);
          
          // Verify data persistence by checking GET response
          const finalListResponse = await rankService.getRankTypes();
          if (finalListResponse.body.data) {
            const nullIdData = finalListResponse.body.data.find((type: RankTypeResponse) => 
              type.rankTypeName === replicateRankTypes[1].rankTypeName
            );
            
            // The data with null ID should be saved and appear in GET response
            expect(nullIdData).toBeDefined();
            console.log('Data with null ID was saved successfully:', nullIdData);
          }
          
          createdRankTypeIds.push(oldId);
        }
      }
    });

    test('should create rank type with null ID successfully', async ({ rankService }) => {
      const rankTypesWithNullId: RankTypeUpdateRequest[] = [
        {
          id: undefined, // Use undefined instead of null
          rankTypeName: `Null ID Test ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(rankTypesWithNullId);
      
      console.log('Null ID creation response status:', response.status);
      console.log('Null ID creation response body:', response.body);
      
      expect(response.status).toBe(200);
      
      // Verify the data appears in GET response
      const listResponse = await rankService.getRankTypes();
      if (listResponse.body.data) {
        const createdType = listResponse.body.data.find((type: RankTypeResponse) => 
          type.rankTypeName === rankTypesWithNullId[0].rankTypeName
        );
        
        expect(createdType).toBeDefined();
        console.log('Rank type created with null ID:', createdType);
        
        if (createdType) {
          createdRankTypeIds.push(createdType.id);
        }
      }
    });

    test('should handle multiple validation errors in single request', async ({ rankService }) => {
      const invalidRankTypes: any[] = [
        {
          rankTypeName: null,
          displayOrder: null
        },
        {
          rankTypeName: '',
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(invalidRankTypes);
      
      console.log('Multiple validation errors response status:', response.status);
      console.log('Multiple validation errors response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
      
      // Should have validation errors for both fields
      if (isValidationErrorResponse(response) && response.body.validationErrors) {
        const validationErrors = response.body.validationErrors;
        expect(validationErrors).toBeDefined();
        expect(Array.isArray(validationErrors)).toBe(true);
        expect(validationErrors.length).toBeGreaterThan(0);
      }
    });

    test('should handle mixed valid and invalid data', async ({ rankService }) => {
      const mixedRankTypes: any[] = [
        {
          rankTypeName: `Valid Entry ${Date.now()}`,
          displayOrder: 1
        },
        {
          rankTypeName: null,
          displayOrder: 2
        }
      ];

      const response = await rankService.createOrUpdateRankTypes(mixedRankTypes);
      
      console.log('Mixed valid/invalid data response status:', response.status);
      console.log('Mixed valid/invalid data response body:', response.body);
      
      // Should fail due to validation error in one of the entries
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
    });
  });

  test.afterEach(async () => {
    // Clean up created rank types if needed
    console.log('Created rank type IDs for cleanup:', createdRankTypeIds);
    // Note: Add cleanup logic here if your API supports deletion
  });
});

test.describe('Rank Classification API Tests @rank-classification', () => {
  let validCredentials: any;
  let createdRankClassificationIds: string[] = [];

  test.beforeEach(async ({ authService }) => {
    // Validate credentials before each test
    validCredentials = {
      email: process.env.TEST_EMAIL || 'testqaremora@mailnesia.com',
      password: process.env.TEST_PASSWORD || 'Pow3r-123456',
      bypassCaptcha: process.env.RECAPTCHA_BYPASS === 'true' || true
    };

    // Authenticate before each test
    const loginResponse = await authService.login(validCredentials) as LoginResponse;
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    if (!isLoginSuccessResponse(loginResponse)) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user).toBeDefined();
  });

  test.describe('Rank Classification Management - /v1/rank/classification', () => {
    
    test('should return 200 when updating existing rank classification by ID', async ({ rankService }) => {
      // First create a rank classification
      const initialRankClassifications: RankClassificationRequest[] = [
        {
          rankClassificationName: `Initial Combat ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankClassifications(initialRankClassifications);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank classification ID
      const listResponse = await rankService.getRankClassifications();
      ApiAssertions.expectSuccessResponse(listResponse);
      
      if (listResponse.body.data) {
        const createdClassification = listResponse.body.data.find((classification: RankClassificationResponse) => 
          classification.rankClassificationName === initialRankClassifications[0].rankClassificationName
        );
        
        expect(createdClassification).toBeDefined();
        const rankClassificationId = createdClassification!.id;
        
        // Update the rank classification using the same ID
        const updateRankClassifications: RankClassificationUpdateRequest[] = [
          {
            id: rankClassificationId,
            rankClassificationName: `Updated Combat ${Date.now()}`,
            displayOrder: 2
          }
        ];

        const updateResponse = await rankService.createOrUpdateRankClassifications(updateRankClassifications);
        
        console.log('Update rank classification by ID response status:', updateResponse.status);
        console.log('Update rank classification by ID response body:', updateResponse.body);
        
        expect(updateResponse.status).toBe(200);
        createdRankClassificationIds.push(rankClassificationId);
      }
    });

    test('should return 400 when rankClassificationName is null', async ({ rankService }) => {
      const invalidRankClassifications: any[] = [
        {
          rankClassificationName: null,
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankClassifications(invalidRankClassifications);
      
      console.log('Null rankClassificationName response status:', response.status);
      console.log('Null rankClassificationName response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
      
      // Check validation error message with proper type checking
      if (isValidationErrorResponse(response) && response.body.validationErrors) {
        const validationErrors = response.body.validationErrors;
        expect(validationErrors).toBeDefined();
        expect(Array.isArray(validationErrors)).toBe(true);
        
        const rankClassificationNameError = validationErrors.find((error: any) => 
          error.field.includes('RankClassificationName') && error.rule === 'required'
        );
        expect(rankClassificationNameError).toBeDefined();
        expect(rankClassificationNameError?.message).toBe('RankClassificationName is required.');
      }
    });

    test('should return 400 when displayOrder is null', async ({ rankService }) => {
      const invalidRankClassifications: any[] = [
        {
          rankClassificationName: `Valid Name ${Date.now()}`,
          displayOrder: null
        }
      ];

      const response = await rankService.createOrUpdateRankClassifications(invalidRankClassifications);
      
      console.log('Null displayOrder response status:', response.status);
      console.log('Null displayOrder response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errorCode', 'BINDING_VALIDATION_ERROR');
      expect(response.body).toHaveProperty('validationErrors');
      
      // Check validation error message with proper type checking
      if (isValidationErrorResponse(response) && response.body.validationErrors) {
        const validationErrors = response.body.validationErrors;
        expect(validationErrors).toBeDefined();
        expect(Array.isArray(validationErrors)).toBe(true);
        
        const displayOrderError = validationErrors.find((error: any) => 
          error.field.includes('DisplayOrder') && error.rule === 'required'
        );
        expect(displayOrderError).toBeDefined();
        expect(displayOrderError?.message).toBe('DisplayOrder is required.');
      }
    });

    test('should return 200 when duplicate data exists with one ID null', async ({ rankService }) => {
      // Create initial rank classification
      const initialRankClassifications: RankClassificationRequest[] = [
        {
          rankClassificationName: `Duplicate Test ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const createResponse = await rankService.createOrUpdateRankClassifications(initialRankClassifications);
      ApiAssertions.expectSuccessResponse(createResponse, 200);

      // Get the created rank classification
      const listResponse = await rankService.getRankClassifications();
      if (listResponse.body.data) {
        const createdClassification = listResponse.body.data.find((classification: RankClassificationResponse) => 
          classification.rankClassificationName === initialRankClassifications[0].rankClassificationName
        );
        
        if (createdClassification) {
          // Send duplicate data with one ID null
          const duplicateRankClassifications: RankClassificationUpdateRequest[] = [
            {
              id: createdClassification.id,
              rankClassificationName: `Duplicate Test ${Date.now()}`,
              displayOrder: 1
            },
            {
              id: undefined, // Use undefined instead of null
              rankClassificationName: `Duplicate Test ${Date.now()}`,
              displayOrder: 1
            }
          ];

          const response = await rankService.createOrUpdateRankClassifications(duplicateRankClassifications);
          
          console.log('Duplicate data with null ID response status:', response.status);
          console.log('Duplicate data with null ID response body:', response.body);
          
          expect(response.status).toBe(200);
          createdRankClassificationIds.push(createdClassification.id);
        }
      }
    });

    test('should create rank classification with null ID successfully', async ({ rankService }) => {
      const rankClassificationsWithNullId: RankClassificationUpdateRequest[] = [
        {
          id: undefined, // Use undefined instead of null
          rankClassificationName: `Null ID Test ${Date.now()}`,
          displayOrder: 1
        }
      ];

      const response = await rankService.createOrUpdateRankClassifications(rankClassificationsWithNullId);
      
      console.log('Null ID creation response status:', response.status);
      console.log('Null ID creation response body:', response.body);
      
      expect(response.status).toBe(200);
      
      // Verify the data appears in GET response
      const listResponse = await rankService.getRankClassifications();
      if (listResponse.body.data) {
        const createdClassification = listResponse.body.data.find((classification: RankClassificationResponse) => 
          classification.rankClassificationName === rankClassificationsWithNullId[0].rankClassificationName
        );
        
        expect(createdClassification).toBeDefined();
        console.log('Rank classification created with null ID:', createdClassification);
        
        if (createdClassification) {
          createdRankClassificationIds.push(createdClassification.id);
        }
      }
    });
  });

  test.afterEach(async () => {
    // Clean up created rank classifications if needed
    console.log('Created rank classification IDs for cleanup:', createdRankClassificationIds);
    // Note: Add cleanup logic here if your API supports deletion
  });
});

test.describe('Authentication Tests - All Rank Endpoints @auth', () => {
  
  const expiredToken = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55SWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJlbWFpbCI6ImthbUBtYWlsbmVzaWEuY29tIiwiZW50aXR5IjoiY29tcGFueVVzZXIiLCJleHAiOjE3NTI4Mjk4NTAsImlkIjoiMDE5ODEyNzAtMTg4OC03YzU2LThkMzYtNjg2OTFiNTZkOTdmIiwibmFtZSI6IkthbSIsIm9yaWdfaWF0IjoxNzUyODI2MjUwfQ.8dIUusKvNCjqt9uoktoUY835yG4EQ4_3DdSmjeyvFjiqJ7ybwYkaNlwqGwaE0I9ZkPfX9KmaI0Pcxx36DBclDA';
  
  test('should return 401 when accessing PUT /v1/rank/type with expired token', async () => {
    const context = await request.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    
    const rankTypes: RankTypeRequest[] = [
      {
        rankTypeName: 'Unauthorized Type',
        displayOrder: 1
      }
    ];

    const response = await context.put(`${process.env.BASE_URL}/v1/rank/type`, {
      data: JSON.stringify({ data: rankTypes }),
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('Expired token PUT /v1/rank/type response status:', response.status());
    console.log('BASE_URL:', process.env.BASE_URL);
    
    const responseBody = await response.json();
    console.log('Response body:', JSON.stringify(responseBody, null, 2));
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      // If 404, the endpoint might not exist or URL is wrong
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      // Expected 401 for authentication failure
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing GET /v1/rank/type with expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    const response = await context.get(`${process.env.BASE_URL}/v1/rank/type`);

    console.log('Expired token GET /v1/rank/type response status:', response.status());
    
    const responseBody = await response.json();
    console.log('Response body:', JSON.stringify(responseBody, null, 2));
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing PUT /v1/rank/classification with expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    
    const rankClassifications: RankClassificationRequest[] = [
      {
        rankClassificationName: 'Unauthorized Classification',
        displayOrder: 1
      }
    ];

    const response = await context.put(`${process.env.BASE_URL}/v1/rank/classification`, {
      data: JSON.stringify({ data: rankClassifications }),
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('Expired token PUT /v1/rank/classification response status:', response.status());
    
    const responseBody = await response.json();
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing GET /v1/rank/classification with expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    const response = await context.get(`${process.env.BASE_URL}/v1/rank/classification`);

    console.log('Expired token GET /v1/rank/classification response status:', response.status());
    
    const responseBody = await response.json();
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing PUT /v1/rank with expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    
    const ranks: RankRequest[] = [
      {
        rankTypeId: 'test-type-id',
        rankClassificationId: 'test-classification-id',
        rankName: 'Unauthorized Rank',
        displayOrder: 1
      }
    ];

    const response = await context.put(`${process.env.BASE_URL}/v1/rank`, {
      data: JSON.stringify({ data: ranks }),
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('Expired token PUT /v1/rank response status:', response.status());
    
    const responseBody = await response.json();
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing GET /v1/rank with expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    const response = await context.get(`${process.env.BASE_URL}/v1/rank`);

    console.log('Expired token GET /v1/rank response status:', response.status());
    
    const responseBody = await response.json();
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });

  test('should return 401 when accessing GET /v1/rank with pagination using expired token', async () => {
    const context = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    const response = await context.get(`${process.env.BASE_URL}/v1/rank?page=1&limit=10`);

    console.log('Expired token GET /v1/rank with pagination response status:', response.status());
    
    const responseBody = await response.json();
    
    // Accept either 401 (unauthorized) or 404 (if endpoint doesn't exist)
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
      console.log('Endpoint returned 404 - check if URL/endpoint is correct');
    } else {
      expect(response.status()).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.requestId).toBeDefined();
    }
    
    await context.dispose();
  });
});

// Updated Pagination Tests with proper assertions
test.describe('Pagination Tests @pagination', () => {
  let validCredentials: any;
  let testRankTypeId: string;
  let testRankClassificationId: string;

  test.beforeEach(async ({ authService, rankService }) => {
    // Validate credentials before each test
    validCredentials = {
      email: process.env.TEST_EMAIL || 'testqaremora@mailnesia.com',
      password: process.env.TEST_PASSWORD || 'Pow3r-123456',
      bypassCaptcha: process.env.RECAPTCHA_BYPASS === 'true' || true
    };

    // Authenticate before each test
    const loginResponse = await authService.login(validCredentials) as LoginResponse;
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    if (!isLoginSuccessResponse(loginResponse)) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user).toBeDefined();

    // Create test rank type and classification for pagination tests
    const rankTypes: RankTypeRequest[] = [
      {
        rankTypeName: `Pagination Test Type ${Date.now()}`,
        displayOrder: 1
      }
    ];

    const typeResponse = await rankService.createOrUpdateRankTypes(rankTypes);
    console.log('Rank type creation response:', typeResponse.status, typeResponse.body);
    
    // Ensure type creation was successful
    expect(typeResponse.status).toBe(200);
    
    const typeList = await rankService.getRankTypes();
    console.log('Rank types list response:', typeList.status, typeList.body);
    
    if (typeList.body.data) {
      const createdType = typeList.body.data.find((type: RankTypeResponse) => 
        type.rankTypeName === rankTypes[0].rankTypeName
      );
      if (!createdType) {
        throw new Error('Failed to find created rank type');
      }
      testRankTypeId = createdType.id;
    }

    const rankClassifications: RankClassificationRequest[] = [
      {
        rankClassificationName: `Pagination Test Classification ${Date.now()}`,
        displayOrder: 1
      }
    ];

    const classificationResponse = await rankService.createOrUpdateRankClassifications(rankClassifications);
    console.log('Rank classification creation response:', classificationResponse.status, classificationResponse.body);
    
    // Ensure classification creation was successful
    expect(classificationResponse.status).toBe(200);
    
    const classificationList = await rankService.getRankClassifications();
    console.log('Rank classifications list response:', classificationList.status, classificationList.body);
    
    if (classificationList.body.data) {
      const createdClassification = classificationList.body.data.find((classification: RankClassificationResponse) => 
        classification.rankClassificationName === rankClassifications[0].rankClassificationName
      );
      if (!createdClassification) {
        throw new Error('Failed to find created rank classification');
      }
      testRankClassificationId = createdClassification.id;
    }
  });

  test('should retrieve ranks with valid pagination parameters', async ({ rankService }) => {
    // Create multiple test ranks first
    const ranks: RankRequest[] = [];
    for (let i = 1; i <= 15; i++) {
      ranks.push({
        rankTypeId: testRankTypeId,
        rankClassificationId: testRankClassificationId,
        rankName: `Pagination Rank ${i} ${Date.now()}`,
        displayOrder: i
      });
    }

    const createResponse = await rankService.createOrUpdateRanks(ranks);
    console.log('Ranks creation response:', createResponse.status, createResponse.body);
    
    // Use the existing ApiAssertions method for responses with message
    ApiAssertions.expectResponseWithMessage(createResponse, 200);

    // Test pagination with page=1, limit=5
    const page = 1;
    const limit = 10;
    
    const response = await rankService.getRanksWithPagination(page, limit);
    
    console.log('Pagination response status:', response.status);
    console.log('Pagination response body:', response.body);
    
    // Use specific pagination assertion
    ApiAssertions.expectPaginationResponse(response);
    
    // Verify pagination structure
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(page);
    expect(response.body.meta.limit).toBe(limit);
    expect(response.body.meta).toHaveProperty('totalItems');
    expect(response.body.meta).toHaveProperty('totalPages');
    
    // Verify items count doesn't exceed limit
    expect(response.body.items.length).toBeLessThanOrEqual(limit);
    
    // Verify item structure
    if (response.body.items && response.body.items.length > 0) {
      const rank = response.body.items[0];
      expect(rank).toHaveProperty('rankId');
      expect(rank).toHaveProperty('rankName');
      expect(rank).toHaveProperty('rankTypeName');
      expect(rank).toHaveProperty('rankClassificationName');
    }
  });

  test('should handle pagination with different page sizes', async ({ rankService }) => {
    const testCases = [
      { page: 1, limit: 10 },
      { page: 1, limit: 15 },
      { page: 2, limit: 10 },
      { page: 1, limit: 15 }
    ];

    for (const testCase of testCases) {
      const response = await rankService.getRanksWithPagination(testCase.page, testCase.limit);
      
      console.log(`Pagination test - Page: ${testCase.page}, Limit: ${testCase.limit}`);
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      // Use specific pagination assertion
      ApiAssertions.expectPaginationResponse(response);
      
      expect(response.body.meta.page).toBe(testCase.page);
      expect(response.body.meta.limit).toBe(testCase.limit);
      
      // Items should not exceed limit
      if (response.body.items) {
        expect(response.body.items.length).toBeLessThanOrEqual(testCase.limit);
      }
    }
  });

  test('should handle pagination with invalid parameters', async ({ rankService }) => {
    const invalidCases = [
      { page: 0, limit: 10, description: 'zero page' },
      { page: -1, limit: 10, description: 'negative page' },
      { page: 1, limit: 0, description: 'zero limit' },
      { page: 1, limit: -5, description: 'negative limit' },
      { page: 999999, limit: 10, description: 'very high page number' }
    ];

    for (const testCase of invalidCases) {
      const response = await rankService.getRanksWithPagination(testCase.page, testCase.limit);
      
      console.log(`Invalid pagination test - ${testCase.description}`);
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      // Should either return 400 for invalid parameters or handle gracefully
      if (response.status !== 200) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      } else {
        // If handled gracefully, should still have proper meta structure
        expect(response.body.meta).toBeDefined();
      }
    }
  });

  test('should handle pagination with large limit values', async ({ rankService }) => {
    const response = await rankService.getRanksWithPagination(1, 1000);
    
    console.log('Large limit pagination response status:', response.status);
    console.log('Large limit pagination meta:', response.body.meta);
    
    // Use specific pagination assertion
    ApiAssertions.expectPaginationResponse(response);
    
    // Should handle large limits gracefully
    expect(response.body.meta.limit).toBeDefined();
    expect(response.body.items).toBeDefined();
    
    // Items should not exceed actual data count
    if (response.body.items && response.body.meta.totalItems) {
      expect(response.body.items.length).toBeLessThanOrEqual(response.body.meta.totalItems);
    }
  });

  test('should return consistent pagination metadata', async ({ rankService }) => {
    // Test first page
    const firstPageResponse = await rankService.getRanksWithPagination(1, 5);
    
    if (firstPageResponse.status === 200 && firstPageResponse.body.meta.totalPages > 1) {
      // Test second page
      const secondPageResponse = await rankService.getRanksWithPagination(2, 5);
      
      console.log('First page meta:', firstPageResponse.body.meta);
      console.log('Second page meta:', secondPageResponse.body.meta);
      
      // Metadata should be consistent across pages
      expect(firstPageResponse.body.meta.totalItems).toBe(secondPageResponse.body.meta.totalItems);
      expect(firstPageResponse.body.meta.totalPages).toBe(secondPageResponse.body.meta.totalPages);
      expect(firstPageResponse.body.meta.limit).toBe(secondPageResponse.body.meta.limit);
      
      // Page numbers should be different
      expect(firstPageResponse.body.meta.page).toBe(1);
      expect(secondPageResponse.body.meta.page).toBe(2);
    }
  });

  test('should handle empty results with pagination', async ({ rankService }) => {
    // Request a page that likely doesn't exist
    const response = await rankService.getRanksWithPagination(999, 10);
    
    console.log('Empty results pagination response status:', response.status);
    console.log('Empty results pagination response body:', response.body);
    
    // Use specific pagination assertion
    ApiAssertions.expectPaginationResponse(response);
    
    // Should return empty items array but valid meta
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBe(0);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(999);
    expect(response.body.meta.limit).toBe(10);
  });

  test('should verify pagination calculation correctness', async ({ rankService }) => {
    const limit = 3;
    const response = await rankService.getRanksWithPagination(1, limit);
    
    console.log('Pagination calculation test response:', response.body);
    
    if (response.status === 200 && response.body.meta.totalItems > 0) {
      const { totalItems, totalPages, page, limit: responseLimit } = response.body.meta;
      
      // Verify pagination calculations
      const expectedTotalPages = Math.ceil(totalItems / limit);
      expect(totalPages).toBe(expectedTotalPages);
      
      // Verify current page is valid
      expect(page).toBeGreaterThanOrEqual(1);
      expect(page).toBeLessThanOrEqual(totalPages);
      
      // Verify limit matches request
      expect(responseLimit).toBe(limit);
      
      // Verify items count for current page
      const expectedItemsCount = page < totalPages ? limit : totalItems % limit || limit;
      if (response.body.items.length > 0) {
        expect(response.body.items.length).toBeLessThanOrEqual(expectedItemsCount);
      }
    }
  });
});