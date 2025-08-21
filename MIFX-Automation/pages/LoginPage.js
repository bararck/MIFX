import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    // Login form inputs
    this.emailInput = '[name="email"], [id="username"], input[type="email"]';
    this.passwordInput = '[name="password"], [id="password"], input[type="password"]';
    this.loginButton = '[type="submit"], .login-btn, .btn-login';
    
    // Remember me checkbox - updated to match your HTML
    this.rememberMeCheckbox = '[name="rememberme"], #checkbox-remember';
    this.rememberMeLabel = 'label[for="checkbox-remember"]';
    
    // Error messages
    this.errorMessage = 'div.col-10:has-text("Akun atau kata sandi salah"), div.col-10:has-text("Incorrect username or password"), .error-message, .alert-danger, .login-error';
    
    // Logout button - updated to match your HTML structure
    this.logoutButton = 'a.logoutMix, a[href*="action-logout.php"], .logout, [data-action="logout"], .btn-logout';
    this.logoutLink = 'a.logoutMix[href*="action-logout.php"]';
  }

  async login(email, password, rememberMe = false) {
    await this.navigateTo('/clientarea');
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    
    if (rememberMe) {
      await this.checkRememberMe();
    }
    
    await this.click(this.loginButton);
  }

  async checkRememberMe() {
    try {
      // Wait for the checkbox to be available
      await this.waitForElement(this.rememberMeCheckbox);
      
      // Check if it's already checked
      const isChecked = await this.page.isChecked(this.rememberMeCheckbox);
      
      if (!isChecked) {
        await this.click(this.rememberMeCheckbox);
      }
    } catch (error) {
      console.log('Remember me checkbox not found or not clickable:', error.message);
    }
  }

  async uncheckRememberMe() {
    try {
      await this.waitForElement(this.rememberMeCheckbox);
      
      const isChecked = await this.page.isChecked(this.rememberMeCheckbox);
      
      if (isChecked) {
        await this.click(this.rememberMeCheckbox);
      }
    } catch (error) {
      console.log('Remember me checkbox not found:', error.message);
    }
  }

  async isRememberMeChecked() {
    try {
      await this.waitForElement(this.rememberMeCheckbox);
      return await this.page.isChecked(this.rememberMeCheckbox);
    } catch (error) {
      return false;
    }
  }

  async getErrorMessage() {
    try {
      await this.waitForElement(this.errorMessage, { timeout: 5000 });
      return await this.getText(this.errorMessage);
    } catch (error) {
      return null;
    }
  }

  async hasErrorMessage() {
    try {
      await this.waitForElement(this.errorMessage, { timeout: 3000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  // FIXED LOGOUT METHOD
  async logout() {
    console.log('Looking for logout button...');
    
    // Try multiple selectors for logout based on your HTML
    const logoutSelectors = [
      'a.logoutMix',
      'a[href*="action-logout.php"]',
      '.logoutMix',
      'a:has-text("Log Out")',
      'a:has-text("Logout")'
    ];

    let logoutClicked = false;
    
    for (const selector of logoutSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        
        // Wait for element to be visible
        await this.page.waitForSelector(selector, { timeout: 5000 });
        
        // Check if visible
        const isVisible = await this.page.isVisible(selector);
        console.log(`Element ${selector} visible: ${isVisible}`);
        
        if (isVisible) {
          // Get the href before clicking (for logging)
          try {
            const href = await this.page.getAttribute(selector, 'href');
            console.log(`Logout URL: ${href}`);
          } catch (e) {
            console.log('Could not get href attribute');
          }
          
          // Click the logout button
          console.log(`Clicking logout button: ${selector}`);
          await this.page.click(selector);
          logoutClicked = true;
          break;
        }
      } catch (error) {
        console.log(`Selector ${selector} not found: ${error.message}`);
        continue;
      }
    }

    if (!logoutClicked) {
      throw new Error('Could not find or click logout button');
    }
    
    console.log('Logout button clicked successfully');

    // Wait a moment for any redirect
    await this.page.waitForTimeout(3000);
    
    // Log final URL (if page still exists)
    try {
      const finalUrl = this.page.url();
      console.log(`Final URL after logout: ${finalUrl}`);
    } catch (error) {
      console.log('Page may have been closed or redirected externally');
    }
  }

  async isLogoutButtonVisible() {
    try {
      return await this.isVisible(this.logoutButton);
    } catch (error) {
      return false;
    }
  }

  async waitForLogoutButton() {
    try {
      await this.waitForElement(this.logoutButton, { timeout: 10000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getLogoutLink() {
    try {
      await this.waitForElement(this.logoutLink);
      return await this.page.getAttribute(this.logoutLink, 'href');
    } catch (error) {
      return null;
    }
  }

  // DEBUG METHOD - to help troubleshoot logout elements
  async debugLogoutElements() {
    console.log('=== DEBUGGING LOGOUT ELEMENTS ===');
    
    try {
      // Find all links on the page
      const allLinks = await this.page.locator('a').all();
      console.log(`Total links found: ${allLinks.length}`);
      
      for (let i = 0; i < allLinks.length; i++) {
        try {
          const link = allLinks[i];
          const text = await link.textContent();
          const href = await link.getAttribute('href');
          const className = await link.getAttribute('class');
          
          if (text && (text.toLowerCase().includes('log') || 
                      href && href.includes('logout') || 
                      href && href.includes('action-logout'))) {
            console.log(`Link ${i}:`, {
              text: text?.trim(),
              href,
              className
            });
          }
        } catch (e) {
          // Skip this link if we can't get its properties
        }
      }

      // Specifically look for the logoutMix class
      const logoutMixElements = await this.page.locator('.logoutMix').all();
      console.log(`LogoutMix elements found: ${logoutMixElements.length}`);
      
      for (let i = 0; i < logoutMixElements.length; i++) {
        const element = logoutMixElements[i];
        const text = await element.textContent();
        const href = await element.getAttribute('href');
        const isVisible = await element.isVisible();
        
        console.log(`LogoutMix ${i}:`, {
          text: text?.trim(),
          href,
          visible: isVisible
        });
      }
    } catch (error) {
      console.log('Debug error:', error.message);
    }
  }

  // SIMPLE CLICK METHOD - alternative approach
  async clickLogout() {
    try {
      const logoutElement = this.page.locator('a.logoutMix').first();
      
      if (await logoutElement.isVisible()) {
        console.log('Clicking the logout element...');
        await logoutElement.click();
        console.log('Logout clicked!');
        
        // Wait and see what happens
        await this.page.waitForTimeout(5000);
        
        try {
          console.log(`URL after click: ${this.page.url()}`);
        } catch (error) {
          console.log('Page closed or redirected after logout');
        }
        
        return true;
      } else {
        console.log('Logout element not visible');
        return false;
      }
    } catch (error) {
      console.log('Click logout error:', error.message);
      return false;
    }
  }

  // Additional helper methods
  async waitForLoginForm() {
    const promises = [
      this.waitForElement(this.emailInput),
      this.waitForElement(this.passwordInput),
      this.waitForElement(this.loginButton)
    ];

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.log('Login form elements not found:', error.message);
      return false;
    }
  }

  async isLoginFormVisible() {
    try {
      const emailVisible = await this.isVisible(this.emailInput);
      const passwordVisible = await this.isVisible(this.passwordInput);
      const buttonVisible = await this.isVisible(this.loginButton);
      
      return emailVisible && passwordVisible && buttonVisible;
    } catch (error) {
      return false;
    }
  }

  async performLogin(credentials) {
    const { email, password, rememberMe = false } = credentials;
    
    await this.waitForLoginForm();
    await this.login(email, password, rememberMe);
    
    // Wait for either successful login (logout button appears) or error message
    try {
      await Promise.race([
        this.waitForElement(this.logoutButton, { timeout: 10000 }),
        this.waitForElement(this.errorMessage, { timeout: 10000 })
      ]);
    } catch (error) {
      console.log('Login result timeout:', error.message);
    }
  }

  // UPDATED PERFORM LOGOUT - handles page closure gracefully
  async performLogout() {
    if (await this.isLogoutButtonVisible()) {
      try {
        await this.logout();
        
        // Wait a bit for any redirect
        await this.page.waitForTimeout(3000);
        
        // Try to verify logout by checking URL or login form
        try {
          const currentUrl = this.page.url();
          const isLoggedOut = !currentUrl.includes('dashboard') ||
                             currentUrl.includes('login') || 
                             currentUrl.includes('clientarea');
          
          if (isLoggedOut) {
            return true;
          }
          
          // If still on dashboard, check if login form is visible
          return await this.isLoginFormVisible();
        } catch (urlError) {
          // If we can't get URL, page might have closed - that's OK for logout
          console.log('URL check failed after logout - likely successful');
          return true;
        }
      } catch (error) {
        console.log('Perform logout error:', error.message);
        return false;
      }
    }
    return false;
  }
}