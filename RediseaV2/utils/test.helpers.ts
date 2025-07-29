import { APIResponse } from '@playwright/test';
export interface RegistrationData {
  name: string;
  email: string;
  password: string;
}

export class TestDataGenerator {
  static generateRegistrationData(): RegistrationData {
    return {
      name: `Test User ${Date.now()}`,
      email: `testuser${Date.now()}@example.com`,
      password: 'Test@1234'
    };
  }
}

export interface AuthValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: any;
  errors: string[];
}

// Add interface for performance measurement
export interface PerformanceMeasurement {
  name: string;
  time: number;
  threshold: number;
}

// Add interface for performance report detail
export interface PerformanceReportDetail {
  name: string;
  time: number;
  threshold: number;
  passed: boolean;
}

// Add interface for performance report
export interface PerformanceReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  details: PerformanceReportDetail[];
}

export class TestHelpers {
  
  // ============ GENERAL UTILITIES ============
  
  static async waitForResponse(
    responsePromise: Promise<any>,
    timeout: number = 30000
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    return Promise.race([responsePromise, timeoutPromise]);
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(delayMs);
      }
    }
    throw new Error('Max retries exceeded');
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeString(str: string): string {
    return str.replace(/[<>]/g, '');
  }

  static validateResponseTime(startTime: number, maxTime: number = 5000): boolean {
    const responseTime = Date.now() - startTime;
    return responseTime <= maxTime;
  }

  static formatTestError(testName: string, error: any): string {
    return `Test "${testName}" failed: ${error.message || error}`;
  }

  static withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      )
    ]);
  }

  static compareObjects(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static extractErrorMessages(response: any): string[] {
    const errors: string[] = [];
    
    if (response.body?.message) {
      errors.push(response.body.message);
    }
    
    if (response.body?.errors) {
      if (Array.isArray(response.body.errors)) {
        errors.push(...response.body.errors);
      } else if (typeof response.body.errors === 'object') {
        Object.values(response.body.errors).forEach(error => {
          if (Array.isArray(error)) {
            errors.push(...error);
          } else {
            errors.push(String(error));
          }
        });
      }
    }
    
    return errors;
  }

  static calculateResponseTime(startTime: number): number {
    return Date.now() - startTime;
  }

  static isResponseSuccessful(status: number): boolean {
    return status >= 200 && status < 300;
  }

  static isResponseError(status: number): boolean {
    return status >= 400;
  }

  static logTestStep(step: string, data?: any): void {
    console.log(`[TEST STEP] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static logTestResult(testName: string, passed: boolean, duration?: number): void {
    const status = passed ? 'PASSED' : 'FAILED';
    const time = duration ? ` (${duration}ms)` : '';
    console.log(`[TEST RESULT] ${testName}: ${status}${time}`);
  }

  // ============ AUTHENTICATION HELPERS ============

  /**
   * Setup an authenticated user for testing
   */
  static async setupAuthenticatedUser(authService: any): Promise<{ credentials: RegistrationData; token: string }> {
  const credentials = TestDataGenerator.generateRegistrationData();
  
  // Register the user
  const registerResponse = await authService.register(credentials);
  
  if (![200, 201].includes(registerResponse.status)) {
    throw new Error(`Registration failed: ${registerResponse.status} - ${registerResponse.body?.message}`);
  }
  
  // Wait for user setup
  await this.waitForTokenSetup(1000);
  
  // Login to get token - create separate login data object
  const loginData = {
    email: credentials.email,
    password: credentials.password,
    bypassCaptcha: true // Add bypassCaptcha specifically for login
  };
  
  const loginResponse = await authService.login(loginData);
  
  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${loginResponse.status} - ${loginResponse.body?.message}`);
  }
  
  if (!loginResponse.body?.token) {
    throw new Error('No token received from login');
  }
  
  return {
    credentials,
    token: loginResponse.body.token
  };
  }
  /**
   * Wait for token setup/processing
   */
  static async waitForTokenSetup(delayMs: number = 500): Promise<void> {
    await this.delay(delayMs);
  }

  /**
   * Validate authentication response structure
   */
  static validateAuthResponse(response: any, expectedStatus: number): AuthValidationResult {
    const errors: string[] = [];
    
    if (response.status !== expectedStatus) {
      errors.push(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    if (!response.body) {
      errors.push('Response body is missing');
      return { isValid: false, errors };
    }
    
    // Check for success responses
    if ([200, 201].includes(expectedStatus)) {
      if (!response.body.message && !response.body.token) {
        errors.push('Success response missing message or token');
      }
      
      if (response.body.token && !this.validateJWTToken(response.body.token).isValid) {
        errors.push('Invalid JWT token format');
      }
    }
    
    // Check for error responses
    if ([400, 401, 422, 429].includes(expectedStatus)) {
      if (!response.body.message) {
        errors.push('Error response missing message');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JWT token format
   */
  static validateJWTToken(token: string): TokenValidationResult {
    const errors: string[] = [];
    
    if (!token) {
      errors.push('Token is empty or null');
      return { isValid: false, errors };
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      errors.push('JWT token must have exactly 3 parts');
      return { isValid: false, errors };
    }
    
    try {
      // Validate header
      const header = JSON.parse(atob(parts[0]));
      if (!header.alg || !header.typ) {
        errors.push('JWT header missing required fields');
      }
      
      // Validate payload
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp || !payload.iat) {
        errors.push('JWT payload missing required fields');
      }
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        errors.push('JWT token is expired');
      }
      
      return {
        isValid: errors.length === 0,
        payload,
        errors
      };
    } catch (error) {
      errors.push(`JWT parsing error: ${error.message}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Validate user data structure
   */
  static validateUserData(userData: any): AuthValidationResult {
    const errors: string[] = [];
    
    if (!userData) {
      errors.push('User data is missing');
      return { isValid: false, errors };
    }
    
    // Required fields
    const requiredFields = ['email', 'id'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
    
    // Validate email format
    if (userData.email && !this.isValidEmail(userData.email)) {
      errors.push('Invalid email format');
    }
    
    // Validate ID format (assuming UUID)
    if (userData.id && !this.isValidUUID(userData.id)) {
      errors.push('Invalid user ID format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create multiple test users for concurrent testing
   */
  static async createMultipleUsers(authService: any, count: number = 3): Promise<Array<{ credentials: RegistrationData; token: string }>> {
    const userPromises = Array.from({ length: count }, () => 
      this.setupAuthenticatedUser(authService)
    );
    
    const results = await Promise.allSettled(userPromises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  /**
   * Clean up test users (if cleanup endpoint exists)
   */
  static async cleanupTestUsers(authService: any, userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        await authService.deleteUser(userId);
      }
    } catch (error) {
      console.warn('Failed to cleanup test users:', error.message);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): AuthValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate token expiration
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Extract user ID from token
   */
  static extractUserIdFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || payload.id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate session state
   */
  static validateSessionState(sessionData: any): AuthValidationResult {
    const errors: string[] = [];
    
    if (!sessionData) {
      errors.push('Session data is missing');
      return { isValid: false, errors };
    }
    
    if (!sessionData.token) {
      errors.push('Session token is missing');
    }
    
    if (!sessionData.user) {
      errors.push('Session user data is missing');
    }
    
    if (sessionData.token && this.isTokenExpired(sessionData.token)) {
      errors.push('Session token is expired');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============ CREW COMPONENT VALIDATION HELPERS ============

  /**
   * Validate component response structure
   */
  static validateComponentResponse(response: any): boolean {
    return (
      response.body &&
      response.body.message &&
      response.body.generatedIds &&
      response.body.generatedIds.groups &&
      response.body.generatedIds.components &&
      Array.isArray(response.body.generatedIds.groups.created) &&
      Array.isArray(response.body.generatedIds.groups.updated) &&
      Array.isArray(response.body.generatedIds.groups.deleted) &&
      Array.isArray(response.body.generatedIds.components.created) &&
      Array.isArray(response.body.generatedIds.components.updated) &&
      Array.isArray(response.body.generatedIds.components.deleted)
    );
  }

  /**
   * Validate all response structure
   */
  static validateAllResponse(response: any): boolean {
    return (
      response.body &&
      response.body.data &&
      Array.isArray(response.body.data)
    );
  }

  /**
   * Validate paginated response structure
   */
  static validatePaginatedResponse(response: any): boolean {
    return (
      response.body &&
      response.body.items &&
      response.body.meta &&
      Array.isArray(response.body.items) &&
      typeof response.body.meta.page === 'number' &&
      typeof response.body.meta.limit === 'number' &&
      typeof response.body.meta.totalItems === 'number' &&
      typeof response.body.meta.totalPages === 'number'
    );
  }

  /**
   * Validate component structure
   */
  static validateComponentStructure(component: any): AuthValidationResult {
    const errors: string[] = [];
    
    if (!component) {
      errors.push('Component is missing');
      return { isValid: false, errors };
    }
    
    const requiredFields = ['tempId', 'componentName', 'fieldType'];
    for (const field of requiredFields) {
      if (!component[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
    
    const validFieldTypes = [
      'Single Text', 'Multi Text', 'Single Select', 'Multi Select',
      'Date', 'Number', 'Email', 'Phone Number', 'File Upload'
    ];
    
    if (component.fieldType && !validFieldTypes.includes(component.fieldType)) {
      errors.push(`Invalid field type: ${component.fieldType}`);
    }
    
    if (component.tempId && !this.isValidUUID(component.tempId)) {
      errors.push('Invalid tempId format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate group structure
   */
  static validateGroupStructure(group: any): AuthValidationResult {
    const errors: string[] = [];
    
    if (!group) {
      errors.push('Group is missing');
      return { isValid: false, errors };
    }
    
    const requiredFields = ['tempId', 'name', 'type', 'category'];
    for (const field of requiredFields) {
      if (!group[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
    
    const validTypes = ['Single Data', 'Multiple Data'];
    if (group.type && !validTypes.includes(group.type)) {
      errors.push(`Invalid group type: ${group.type}`);
    }
    
    const validCategories = ['Profile', 'Certificate', 'Document', 'Experience'];
    if (group.category && !validCategories.includes(group.category)) {
      errors.push(`Invalid group category: ${group.category}`);
    }
    
    if (group.tempId && !this.isValidUUID(group.tempId)) {
      errors.push('Invalid tempId format');
    }
    
    if (group.components && !Array.isArray(group.components)) {
      errors.push('Components must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============ API RESPONSE HELPERS ============

  /**
   * Extract pagination info from response
   */
  static extractPaginationInfo(response: any): any {
    if (!response.body?.meta) {
      return null;
    }
    
    return {
      currentPage: response.body.meta.page,
      itemsPerPage: response.body.meta.limit,
      totalItems: response.body.meta.totalItems,
      totalPages: response.body.meta.totalPages,
      hasNextPage: response.body.meta.page < response.body.meta.totalPages,
      hasPreviousPage: response.body.meta.page > 1
    };
  }

  /**
   * Check if response has expected structure
   */
  static hasExpectedStructure(response: any, expectedStructure: any): boolean {
    function checkStructure(obj: any, expected: any): boolean {
      if (typeof expected === 'string') {
        return typeof obj === expected;
      }
      
      if (Array.isArray(expected)) {
        return Array.isArray(obj) && expected.every(item => 
          obj.some(objItem => checkStructure(objItem, item))
        );
      }
      
      if (typeof expected === 'object' && expected !== null) {
        if (typeof obj !== 'object' || obj === null) {
          return false;
        }
        
        return Object.keys(expected).every(key => 
          obj.hasOwnProperty(key) && checkStructure(obj[key], expected[key])
        );
      }
      
      return obj === expected;
    }
    
    return checkStructure(response, expectedStructure);
  }

  /**
   * Validate response headers
   */
  static validateResponseHeaders(response: any, expectedHeaders: Record<string, string>): AuthValidationResult {
    const errors: string[] = [];
    
    if (!response.headers) {
      errors.push('Response headers are missing');
      return { isValid: false, errors };
    }
    
    Object.entries(expectedHeaders).forEach(([key, expectedValue]) => {
      const actualValue = response.headers[key.toLowerCase()];
      if (actualValue !== expectedValue) {
        errors.push(`Expected header '${key}' to be '${expectedValue}', got '${actualValue}'`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check rate limiting headers
   */
  static extractRateLimitInfo(response: any): any {
    if (!response.headers) {
      return null;
    }
    
    return {
      limit: response.headers['x-rate-limit-limit'],
      remaining: response.headers['x-rate-limit-remaining'],
      reset: response.headers['x-rate-limit-reset'],
      retryAfter: response.headers['retry-after']
    };
  }

  /**
   * Wait for rate limit reset
   */
  static async waitForRateLimitReset(response: any): Promise<void> {
    const rateLimitInfo = this.extractRateLimitInfo(response);
    if (rateLimitInfo?.retryAfter) {
      const waitTime = parseInt(rateLimitInfo.retryAfter) * 1000;
      await this.delay(waitTime);
    }
  }

  // ============ PERFORMANCE HELPERS ============

  /**
   * Measure execution time
   */
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    return { result, executionTime };
  }

  /**
   * Check if response time is within acceptable limits
   */
  static isResponseTimeAcceptable(executionTime: number, maxTime: number = 5000): boolean {
    return executionTime <= maxTime;
  }

  /**
   * Create performance report
   */
  static createPerformanceReport(measurements: PerformanceMeasurement[]): PerformanceReport {
    const report: PerformanceReport = {
      totalTests: measurements.length,
      passedTests: 0,
      failedTests: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
      details: []
    };
    
    measurements.forEach(measurement => {
      const passed = measurement.time <= measurement.threshold;
      if (passed) {
        report.passedTests++;
      } else {
        report.failedTests++;
      }
      
      report.maxTime = Math.max(report.maxTime, measurement.time);
      report.minTime = Math.min(report.minTime, measurement.time);
      
      report.details.push({
        name: measurement.name,
        time: measurement.time,
        threshold: measurement.threshold,
        passed
      });
    });
    
    report.averageTime = measurements.reduce((sum, m) => sum + m.time, 0) / measurements.length;
    
    return report;
  }
}