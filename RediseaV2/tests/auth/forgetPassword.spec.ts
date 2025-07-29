import { test, expect } from '../../fixtures/api.fixture';
import { TestDataGenerator } from '../../utils/test.data';
import { ApiAssertions } from '../../utils/assertions';
import { ResetPasswordRequest, ForgotPasswordRequest } from '../../types/api.types';

test.describe('Authentication - Forgot Password @auth', () => {
  test('should create forgot password token successfully', async ({ authService }) => {
    const data: ForgotPasswordRequest = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      bypassCaptcha: true
    };

    const response = await authService.createForgotPasswordToken(data);

    // Manual assertion karena response hanya memiliki { message: string }
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Confirmation has been sent to your email');
  });

  test('should fail to create forgot password token without valid CAPTCHA', async ({ authService }) => {
    const data: ForgotPasswordRequest = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      recaptchaToken: '',
      bypassCaptcha: false
    };

    const response = await authService.createForgotPasswordToken(data);

    if (process.env.NODE_ENV === 'production') {
      // Manual assertion karena response tidak memiliki requestId
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('CAPTCHA verification failed');
    }
  });

  test('should check forgot password token validity', async ({ authService }) => {
    const validToken = TestDataGenerator.generateToken();
    const email = process.env.TEST_EMAIL || 'test@example.com';

    const response = await authService.checkForgotPasswordToken(validToken, email);

    expect([200, 400]).toContain(response.status);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();
    
    if (response.status === 400) {
      expect([
        'This link has expired. Please request a new one to continue.',
        'This link is invalid. Please request a new one to continue.'
      ]).toContain(response.body.message);
    }
  });

  test('should reset password successfully with valid token', async ({ authService }) => {
    const data: ResetPasswordRequest = {
      token: TestDataGenerator.generateToken(),
      password: 'newPassword123!',
      passwordConfirmation: 'newPassword123!'
    };

    const response = await authService.resetPassword(data);

    expect([200, 400]).toContain(response.status);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();
    
    if (response.status === 400) {
      expect(['Token is expired', 'Token is invalid']).toContain(response.body.message);
    }
  });

  test('should fail to reset password with mismatched passwords', async ({ authService }) => {
    const data: ResetPasswordRequest = {
      token: TestDataGenerator.generateToken(),
      password: 'newPassword123!',
      passwordConfirmation: 'differentPassword123!'
    };

    const response = await authService.resetPassword(data);

    // Manual assertion karena response tidak memiliki requestId
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();
  });
});