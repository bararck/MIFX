import { test, expect } from '../../fixtures/api.fixture';
import { TestDataGenerator } from '../../utils/test.data';
import { ApiAssertions, TestResponse } from '../../utils/assertions';
import { 
  CreateUserResponse, 
  LoginResponse, 
  ValidateTokenResponse, 
  CreateCompanyResponse, 
  SetCompanyResponse, 
  CreateStakeholderResponse, 
  GetCompaniesResponse, 
  GetStakeholdersResponse, 
  RefreshTokenResponse 
} from '../../types/api.types';
import { CrewComponentRequest, CrewComponentCategory } from '../../types/api.types';


// Helper function to safely cast response with proper structure
function castToTestResponse<T>(response: any): TestResponse<T> | null {
  if (response && typeof response === 'object' && 'status' in response) {
    return {
      status: response.status,
      body: response.body || response
    } as TestResponse<T>;
  }
  return null;
}

test.describe('End-to-End Integration Tests @e2e', () => {
  let userEmail: string;
  let userPassword: string;
  let companyId: string | undefined;
  let stakeholderId: string | undefined;

  test.beforeAll(async () => {
    userEmail = TestDataGenerator.generateEmail();
    userPassword = TestDataGenerator.generatePassword();
  });

  test('should complete full user journey', async ({ 
    authService, 
    companyService, 
    stakeholderService 
  }) => {
    // Step 1: Create a new user
    console.log('Step 1: Creating user...');
    const userData = {
      name: 'Integration Test User',
      email: userEmail,
      password: userPassword,
      companyId: null
    };

    const tempToken = process.env.TEMP_CREATE_USER_TOKEN || 'test-token';
    
    try {
      const createUserResponse = await authService.createUser(userData, tempToken);
      const typedResponse = castToTestResponse<CreateUserResponse>(createUserResponse);
      
      if (typedResponse) {
        console.log(`User creation status: ${typedResponse.status}`);
        if (typedResponse.status === 201) {
          ApiAssertions.expectCreatedResponse(typedResponse);
          expect(typedResponse.body.data?.user?.email || typedResponse.body.user?.email).toBe(userEmail);
          console.log('✓ User created successfully');
        } else {
          console.log(`❌ User creation failed with status: ${typedResponse.status}`);
          throw new Error(`User creation failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ User creation failed - Invalid response structure');
        throw new Error('Invalid response structure from createUser');
      }
    } catch (error) {
      console.error('❌ User creation error:', error);
      throw error;
    }

    // Step 2: Login with the new user
    console.log('Step 2: Logging in...');
    const loginData = {
      email: userEmail,
      password: userPassword,
      bypassCaptcha: true
    };

    try {
      const loginResponse = await authService.login(loginData);
      const typedResponse = castToTestResponse<LoginResponse>(loginResponse);
      
      if (typedResponse) {
        console.log(`Login status: ${typedResponse.status}`);
        if (typedResponse.status === 200) {
          ApiAssertions.expectSuccessResponse(typedResponse);
          expect(typedResponse.body.data?.user?.email || typedResponse.body.user?.email).toBe(userEmail);
          console.log('✓ Login successful');
        } else {
          console.log(`❌ Login failed with status: ${typedResponse.status}`);
          throw new Error(`Login failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Login failed - Invalid response structure');
        throw new Error('Invalid response structure from login');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }

    // Step 3: Validate token
    console.log('Step 3: Validating token...');
    try {
      const validateResponse = await authService.validateToken();
      const typedResponse = castToTestResponse<ValidateTokenResponse>(validateResponse);
      
      if (typedResponse) {
        console.log(`Token validation status: ${typedResponse.status}`);
        if (typedResponse.status === 200) {
          ApiAssertions.expectSuccessResponse(typedResponse);
          expect(typedResponse.body.data?.user?.email || typedResponse.body.user?.email).toBe(userEmail);
          console.log('✓ Token validation successful');
        } else {
          console.log(`❌ Token validation failed with status: ${typedResponse.status}`);
          throw new Error(`Token validation failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Token validation failed - Invalid response structure');
        throw new Error('Invalid response structure from validateToken');
      }
    } catch (error) {
      console.error('❌ Token validation error:', error);
      throw error;
    }

    // Step 4: Create a company
    console.log('Step 4: Creating company...');
    const companyData = {
      name: TestDataGenerator.generateCompanyName()
    };

    try {
      const createCompanyResponse = await companyService.createCompany(companyData);
      const typedResponse = castToTestResponse<CreateCompanyResponse>(createCompanyResponse);
      
      if (typedResponse) {
        console.log(`Company creation status: ${typedResponse.status}`);
        if (typedResponse.status === 200 || typedResponse.status === 201) {
          if (typedResponse.status === 200) {
            ApiAssertions.expectSuccessResponse(typedResponse);
          } else {
            ApiAssertions.expectCreatedResponse(typedResponse);
          }
          // Fixed: Access company data safely with type assertion
          companyId = (typedResponse.body as any).data?.company?.id || (typedResponse.body as any).company?.id;
          console.log('✓ Company created successfully');
        } else {
          console.log(`❌ Company creation failed with status: ${typedResponse.status}`);
          throw new Error(`Company creation failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Company creation failed - Invalid response structure');
        throw new Error('Invalid response structure from createCompany');
      }
    } catch (error) {
      console.error('❌ Company creation error:', error);
      throw error;
    }

    // Step 5: Set company for user
    if (companyId) {
      console.log('Step 5: Setting company for user...');
      try {
        const setCompanyResponse = await authService.setCompany(companyId);
        const typedResponse = castToTestResponse<SetCompanyResponse>(setCompanyResponse);
        
        if (typedResponse) {
          console.log(`Set company status: ${typedResponse.status}`);
          if (typedResponse.status === 200) {
            ApiAssertions.expectSuccessResponse(typedResponse);
            expect(typedResponse.body.data?.user?.companyId || typedResponse.body.user?.companyId).toBe(companyId);
            console.log('✓ Company set for user successfully');
          } else {
            console.log(`❌ Set company failed with status: ${typedResponse.status}`);
            throw new Error(`Set company failed: ${typedResponse.body.message || 'Unknown error'}`);
          }
        } else {
          console.log('❌ Set company failed - Invalid response structure');
          throw new Error('Invalid response structure from setCompany');
        }
      } catch (error) {
        console.error('❌ Set company error:', error);
        throw error;
      }
    }

    // Step 6: Create a stakeholder
    console.log('Step 6: Creating stakeholder...');
    const stakeholderData = {
      name: TestDataGenerator.generateStakeholderName()
    };

    try {
      const createStakeholderResponse = await stakeholderService.createStakeholder(stakeholderData);
      const typedResponse = castToTestResponse<CreateStakeholderResponse>(createStakeholderResponse);
      
      if (typedResponse) {
        console.log(`Stakeholder creation status: ${typedResponse.status}`);
        if (typedResponse.status === 200 || typedResponse.status === 201) {
          if (typedResponse.status === 200) {
            ApiAssertions.expectSuccessResponse(typedResponse);
          } else {
            ApiAssertions.expectCreatedResponse(typedResponse);
          }
          // Fixed: Access stakeholder data safely with type assertion
          stakeholderId = (typedResponse.body as any).data?.stakeholder?.id || (typedResponse.body as any).stakeholder?.id;
          console.log('✓ Stakeholder created successfully');
        } else {
          console.log(`❌ Stakeholder creation failed with status: ${typedResponse.status}`);
          throw new Error(`Stakeholder creation failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Stakeholder creation failed - Invalid response structure');
        throw new Error('Invalid response structure from createStakeholder');
      }
    } catch (error) {
      console.error('❌ Stakeholder creation error:', error);
      throw error;
    }

    // Step 7: Get companies list
    console.log('Step 7: Getting companies list...');
    try {
      const getCompaniesResponse = await companyService.getCompanies();
      const typedResponse = castToTestResponse<GetCompaniesResponse>(getCompaniesResponse);
      
      if (typedResponse) {
        console.log(`Get companies status: ${typedResponse.status}`);
        if (typedResponse.status === 200) {
          ApiAssertions.expectSuccessResponse(typedResponse);
          // Check if response has pagination structure
          if (typedResponse.body.meta) {
            ApiAssertions.expectValidPaginationFlexible(typedResponse);
          }
          console.log('✓ Companies list retrieved successfully');
        } else {
          console.log(`❌ Get companies failed with status: ${typedResponse.status}`);
          throw new Error(`Get companies failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Get companies failed - Invalid response structure');
        throw new Error('Invalid response structure from getCompanies');
      }
    } catch (error) {
      console.error('❌ Get companies error:', error);
      throw error;
    }

    // Step 8: Get stakeholders list
    console.log('Step 8: Getting stakeholders list...');
    try {
      const getStakeholdersResponse = await stakeholderService.getStakeholders();
      const typedResponse = castToTestResponse<GetStakeholdersResponse>(getStakeholdersResponse);
      
      if (typedResponse) {
        console.log(`Get stakeholders status: ${typedResponse.status}`);
        if (typedResponse.status === 200) {
          ApiAssertions.expectSuccessResponse(typedResponse);
          // Check if response has pagination structure
          if (typedResponse.body.meta) {
            ApiAssertions.expectValidPaginationFlexible(typedResponse);
          }
          console.log('✓ Stakeholders list retrieved successfully');
        } else {
          console.log(`❌ Get stakeholders failed with status: ${typedResponse.status}`);
          throw new Error(`Get stakeholders failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Get stakeholders failed - Invalid response structure');
        throw new Error('Invalid response structure from getStakeholders');
      }
    } catch (error) {
      console.error('❌ Get stakeholders error:', error);
      throw error;
    }

    // Step 9: Refresh token
    console.log('Step 9: Refreshing token...');
    try {
      const refreshResponse = await authService.refreshToken();
      const typedResponse = castToTestResponse<RefreshTokenResponse>(refreshResponse);
      
      if (typedResponse) {
        console.log(`Refresh token status: ${typedResponse.status}`);
        if (typedResponse.status === 200) {
          ApiAssertions.expectSuccessResponse(typedResponse);
          // Fixed: Access token data safely with type assertion
          expect((typedResponse.body as any).data?.token?.expiredAt || (typedResponse.body as any).token?.expiredAt).toBeDefined();
          console.log('✓ Token refreshed successfully');
        } else {
          console.log(`❌ Token refresh failed with status: ${typedResponse.status}`);
          throw new Error(`Token refresh failed: ${typedResponse.body.message || 'Unknown error'}`);
        }
      } else {
        console.log('❌ Token refresh failed - Invalid response structure');
        throw new Error('Invalid response structure from refreshToken');
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
    
    

    console.log('🎉 All steps completed successfully!');
  });
});