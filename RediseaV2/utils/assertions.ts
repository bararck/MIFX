import { expect } from '@playwright/test';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';

export interface TestResponse<T = any> {
  status: number;
  body: ApiResponse<T>;
}

export interface PaginatedTestResponse<T = any> {
  status: number;
  body: PaginatedApiResponse<T>;
}

// Special interface for login success response
export interface LoginSuccessResponse {
  status: number;
  body: {
    message: string;
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      companyId: string;
    };
    requestId?: string;
  };
}

export class ApiAssertions {
  static expectSuccessResponse<T>(response: TestResponse<T>, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    
    // Only check for message if it exists in the response body
    // Some successful responses (like pagination) might not have a message field
    if (response.body && typeof response.body === 'object' && 'message' in response.body) {
      expect(response.body.message).toBeDefined();
    }
  }

  // Specific method for pagination responses
  static expectPaginationResponse<T>(response: TestResponse<T>, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    
    if (response.body && typeof response.body === 'object') {
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      
      const meta = (response.body as any).meta;
      expect(meta).toHaveProperty('page');
      expect(meta).toHaveProperty('limit');
      expect(meta).toHaveProperty('totalItems');
      expect(meta).toHaveProperty('totalPages');
    }
  }

  // Method for responses that should have a message
  static expectResponseWithMessage<T>(response: TestResponse<T>, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();
  }

  // Method for error responses
  static expectErrorResponse<T>(response: TestResponse<T>, expectedStatus: number): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    
    // Error responses typically have error or message fields
    if (response.body && typeof response.body === 'object') {
      const hasErrorField = 'error' in response.body || 'message' in response.body;
      expect(hasErrorField).toBe(true);
    }
  }

  // New method specifically for login success
  static expectLoginSuccessResponse<T>(response: TestResponse<T>): void {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    
    if (response.body && typeof response.body === 'object') {
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    }
  }

  // Original method specifically for login success (keeping for backward compatibility)
  static expectLoginSuccess(response: LoginSuccessResponse, expectedEmail: string): void {
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successfully');
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.email).toBe(expectedEmail);
    expect(response.body.user.name).toBeDefined();
    expect(response.body.user.companyId).toBeDefined();
  }

  static expectCreatedResponse<T>(response: TestResponse<T>): void {
    expect(response.status).toBe(201);
    expect(response.body.message).toBeDefined();
    expect(response.body.requestId).toBeDefined();
  }

  static expectUnauthorizedResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(401);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectLoginFailure(response: TestResponse, expectedMessage = 'Incorrect email or password'): void {
    expect(response.status).toBe(401);
    expect(response.body.message).toBe(expectedMessage);
    expect(response.body.requestId).toBeDefined();
  }

  static expectBadRequestResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectConflictResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(409);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectUnprocessableEntityResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(422);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectNotFoundResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(404);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectForbiddenResponse(response: TestResponse, expectedMessage?: string): void {
    expect(response.status).toBe(403);
    expect(response.body.requestId).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    } else {
      expect(response.body.message).toBeDefined();
    }
  }

  static expectInternalServerErrorResponse(response: TestResponse): void {
    expect(response.status).toBe(500);
    expect(response.body.requestId).toBeDefined();
  }

  static expectValidPagination<T>(response: PaginatedTestResponse<T>): void {
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBeGreaterThan(0);
    expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(0);
    expect(response.body.meta.totalItems).toBeGreaterThanOrEqual(0);
    expect(response.body.meta.limit).toBeGreaterThan(0);
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
  }

  static expectValidPaginationFlexible(response: TestResponse): void {
    expect(response.body.meta).toBeDefined();
    if (response.body.meta) {
      expect(response.body.meta.page).toBeGreaterThan(0);
      expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.totalItems).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.limit).toBeGreaterThan(0);
    }
    if (response.body.items) {
      expect(Array.isArray(response.body.items)).toBe(true);
    }
  }

  // Buat assertion yang lebih spesifik
  static expectUserCreatedResponse(response: { status: number; body: { message: string; user: any } }) {
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Create user successfully');
    expect(response.body.user).toBeDefined();
  }
}