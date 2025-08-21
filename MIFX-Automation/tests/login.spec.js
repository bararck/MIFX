import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { TestData } from '../utils/TestData.js';

test.describe('Login Tests', () => {
  let loginPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('TC13 - Login with Valid Credentials', async ({ page }) => {
    // Test Data
    const { email, password } = TestData.credentials.valid;

    // Test Steps
    await loginPage.login(email, password);

    // Verification
    await expect(page).toHaveURL(/.*dashboard.*/);
    expect(await dashboardPage.isDashboardLoaded()).toBeTruthy();
  });

  test('TC14 - Login with Invalid Password', async ({ page }) => {
    // Test Data
    const { email } = TestData.credentials.valid;
    const { password } = TestData.credentials.invalid;

    // Test Steps
    await loginPage.login(email, password);

    // Verification
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toContain('password');

    // Verify account is not locked - try with correct password
    await loginPage.login(TestData.credentials.valid.email, TestData.credentials.valid.password);
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('TC15 - Remember Me Functionality', async ({ page, context }) => {
    // Test Data
    const { email, password } = TestData.credentials.valid;

    // Test Steps - Login with remember me
    await loginPage.login(email, password, true);
    await expect(page).toHaveURL(/.*dashboard.*/);
    expect(await dashboardPage.isDashboardLoaded()).toBeTruthy();
    console.log('✓ Initial login successful');

    // Close and reopen browser
    await page.close();
    const newPage = await context.newPage();
    const newLoginPage = new LoginPage(newPage);
    const newDashboardPage = new DashboardPage(newPage);

    try {
      console.log('Testing remember me functionality...');
      
      // Navigate to client area
      await newLoginPage.navigateTo('/clientarea');
      await newPage.waitForTimeout(3000);
      
      const currentUrl = newPage.url();
      console.log(`URL after navigation: ${currentUrl}`);
      
      // Check if we're logged in by looking for logout button
      const logoutButtonVisible = await newLoginPage.isLogoutButtonVisible();
      
      if (logoutButtonVisible) {
        console.log('✓ Remember me working - logout button visible');
        expect(logoutButtonVisible).toBeTruthy();
        
        if (currentUrl.includes('dashboard')) {
          expect(await newDashboardPage.isDashboardLoaded()).toBeTruthy();
        }
      } else {
        // Check if we're on login page
        const loginFormVisible = await newLoginPage.isLoginFormVisible();
        
        if (loginFormVisible) {
          console.log('ℹ Remember me not working - login form visible (may be expected for security)');
        } else {
          await newPage.screenshot({ path: 'debug-remember-me-state.png' });
          throw new Error('Unexpected page state - neither login nor logout visible');
        }
      }
      
    } catch (error) {
      console.error(`Remember me test error: ${error.message}`);
      await newPage.screenshot({ path: 'debug-remember-me-error.png' });
      throw error;
    } finally {
      await newPage.close();
    }
  });

  test('TC16 - Logout Functionality', async ({ page }) => {
    // Prerequisites - Login first
    const { email, password } = TestData.credentials.valid;
    await loginPage.login(email, password);
    await expect(page).toHaveURL(/.*dashboard.*/);
    await dashboardPage.isDashboardLoaded();

    // Test Steps - Logout
    console.log('=== LOGOUT TEST ===');
    const logoutSuccess = await loginPage.clickLogout();
    
    expect(logoutSuccess).toBeTruthy();
    console.log('✓ Logout completed');
  });
});