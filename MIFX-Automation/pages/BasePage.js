export class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(url) {
    // Add better navigation with timeout and wait condition
    const fullUrl = url.startsWith('http') ? url : `https://mifx.com${url}`;
    
    try {
      await this.page.goto(fullUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Small wait for any immediate redirects
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      console.log(`Navigation to ${fullUrl} failed: ${error.message}`);
      
      // Try with networkidle as fallback
      try {
        await this.page.goto(fullUrl, { 
          waitUntil: 'networkidle',
          timeout: 90000 
        });
      } catch (retryError) {
        console.log(`Retry navigation failed: ${retryError.message}`);
        throw error; // Throw original error
      }
    }
  }

  async waitForElement(selector, timeout = 30000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async click(selector) {
    await this.page.click(selector);
  }

  async fill(selector, value) {
    await this.page.fill(selector, value);
  }

  async getText(selector) {
    return await this.page.textContent(selector);
  }

  async isVisible(selector) {
    return await this.page.isVisible(selector);
  }

  async waitForUrl(url, timeout = 30000) {
    await this.page.waitForURL(url, { timeout });
  }

  async screenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}