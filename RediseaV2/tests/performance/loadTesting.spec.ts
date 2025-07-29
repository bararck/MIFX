import { test, expect } from '../../fixtures/api.fixture';
import { TestDataGenerator } from '../../utils/test.data';

test.describe('Performance Load Testing @performance', () => {
  test('should handle concurrent login requests', async ({ authService }) => {
    const loginData = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'sayang1234',
      bypassCaptcha: true
    };

    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () => 
      authService.login(loginData)
    );

    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect([200, 401, 429]).toContain(response.status); // Allow rate limiting
    });

    // At least some requests should succeed
    const successfulRequests = responses.filter(r => r.status === 200);
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('should handle pagination with large datasets', async ({ companyService, authService }) => {
    // Login first
    const loginData = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'sayang1234',
      bypassCaptcha: true
    };
    await authService.login(loginData);

    // Test different page sizes
    const pageSizes = [1, 5, 10, 25, 50];
    
    for (const pageSize of pageSizes) {
      const response = await companyService.getCompanies(1, pageSize);
      
      if (response.status === 200) {
        expect(response.body.meta.limit).toBe(pageSize);
        expect(response.body.items.length).toBeLessThanOrEqual(pageSize);
      }
    }
  });
});
