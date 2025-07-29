import { test, expect } from '../../fixtures/api.fixture';
import { TestDataGenerator } from '../../utils/test.data';
import { ApiAssertions } from '../../utils/assertions';

test.describe('Authentication - User Management @auth @register', () => {
  const tempToken = process.env.TEMP_CREATE_USER_TOKEN;
  
  test.beforeEach(async () => {
    // Debug: cek apakah env variables terbaca
    console.log('Environment check:');
    console.log('- TEMP_CREATE_USER_TOKEN:', tempToken ? 'SET' : 'NOT SET');
    console.log('- API_BASE_URL:', process.env.API_BASE_URL);
  });

  test('should create user successfully with valid data', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const userData = TestDataGenerator.generateUser();
    console.log('Generated user data:', {
      name: userData.name,
      email: userData.email,
      companyId: userData.companyId
    });

    const response = await authService.createUser(userData, tempToken);
    
    console.log('API Response:', {
      status: response.status,
      message: response.body?.message || 'No message',
      hasUser: !!response.body?.user
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Create user successfully');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe(userData.name);
    expect(response.body.user.email).toBe(userData.email);
  });

  test('should fail to create user with duplicate email', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const userData = TestDataGenerator.generateUser();

    // Create user first
    const firstResponse = await authService.createUser(userData, tempToken);
    expect(firstResponse.status).toBe(201);

    // Try to create duplicate
    const duplicateResponse = await authService.createUser(userData, tempToken);
    
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.message).toBe('User With That Email is Already Exist');
  });

  test('should fail to create user without valid temp token', async ({ authService }) => {
    const userData = TestDataGenerator.generateUser();

    const response = await authService.createUserWithoutToken(userData);
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  test('should fail to create user with invalid temp token', async ({ authService }) => {
    const userData = TestDataGenerator.generateUser();

    const response = await authService.createUser(userData, 'invalid-token');
    
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  test('should fail to create user with invalid company ID format', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const userData = TestDataGenerator.generateUser();
    userData.companyId = 'invalid-company-id'; // Not a valid UUID format

    const response = await authService.createUser(userData, tempToken);

    expect(response.status).toBe(400);
    expect((response.body as any).errorCode).toBe('BINDING_VALIDATION_ERROR');
    expect(response.body.message).toBe('Binding Validation Error');
    expect((response.body as any).validationErrors).toContainEqual({
      field: 'CreateCompanyUserReq.CompanyID',
      rule: 'uuid',
      message: 'CompanyID must be a valid UUID.'
    });
  });

  test('should fail to create user with non-existent company', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const userData = TestDataGenerator.generateUser();
    userData.companyId = TestDataGenerator.generateUUID(); // Valid UUID but non-existent company

    const response = await authService.createUser(userData, tempToken);
    
    // Adjust based on actual API behavior - could be 404, 422, or other status
    expect(response.status).toBe(400); // or whatever status your API returns
    expect(response.body.message).toBe('Company Does Not Exist');
  });

  test('should fail to create user with missing required fields', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const invalidUserData = {
      name: '',
      email: '',
      password: '',
      companyId: null
    };

    const response = await authService.createUser(invalidUserData, tempToken);

    expect(response.status).toBe(400);
    expect((response.body as any).errorCode).toBe('BINDING_VALIDATION_ERROR');
    expect(response.body.message).toBe('Binding Validation Error');
    
    const validationErrors = (response.body as any).validationErrors;
    expect(validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Name',
          rule: 'required',
          message: 'Name is required.'
        }),
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Email',
          rule: 'required',
          message: 'Email is required.'
        }),
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Password',
          rule: 'required',
          message: 'Password is required.'
        })
      ])
    );
    
    expect(validationErrors).toHaveLength(3);
  });

  test('should fail to create user with missing required fields and invalid company ID', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const invalidUserData = {
      name: '',
      email: '',
      password: '',
      companyId: 'invalid-uuid-format'
    };

    const response = await authService.createUser(invalidUserData, tempToken);

    expect(response.status).toBe(400);
    expect((response.body as any).errorCode).toBe('BINDING_VALIDATION_ERROR');
    expect(response.body.message).toBe('Binding Validation Error');
    
    const validationErrors = (response.body as any).validationErrors;
    expect(validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Name',
          rule: 'required',
          message: 'Name is required.'
        }),
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Email',
          rule: 'required',
          message: 'Email is required.'
        }),
        expect.objectContaining({
          field: 'CreateCompanyUserReq.Password',
          rule: 'required',
          message: 'Password is required.'
        }),
        expect.objectContaining({
          field: 'CreateCompanyUserReq.CompanyID',
          rule: 'uuid',
          message: 'CompanyID must be a valid UUID.'
        })
      ])
    );
    
    expect(validationErrors).toHaveLength(4);
  });

  test('should fail to create user with invalid email format', async ({ authService }) => {
    if (!tempToken) {
      throw new Error('TEMP_CREATE_USER_TOKEN is not set in environment variables');
    }

    const userData = TestDataGenerator.generateUser();
    userData.email = 'invalid-email-format'; // Invalid email format

    const response = await authService.createUser(userData, tempToken);

    expect(response.status).toBe(400);
    expect((response.body as any).errorCode).toBe('BINDING_VALIDATION_ERROR');
    expect(response.body.message).toBe('Binding Validation Error');
    expect((response.body as any).validationErrors).toContainEqual(
      expect.objectContaining({
        field: 'CreateCompanyUserReq.Email',
        rule: 'email',
        message: expect.stringContaining('email')
      })
    );
  });
});