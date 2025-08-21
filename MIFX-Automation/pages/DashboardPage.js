import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    // Dashboard header/beranda indicator
    this.dashboardHeader = 'span:has-text("Beranda"), .colorGreen:has-text("Beranda")';
    
    // Balance selectors based on your HTML structure
    this.balanceContainer = '.fontnyabalance:has-text("Balance")';
    this.balanceAmount = '.totalBalance';
    this.balanceSection = '.fontnyadolar';
    
    // Equity selectors
    this.equityContainer = '.fontnyabalance:has-text("Equity")';
    this.equityAmount = '.totalEq';
    this.equityIcon = 'img[src*="iconEquityDashboard"]';
    
    // Trade button
    this.tradeButton = 'a[href="trade-now"]';
    this.tradeButtonContainer = '.greenButton';
    
    // General dashboard elements
    this.accountInfo = this.dashboardHeader;
  }

  async isDashboardLoaded() {
    try {
      // Wait for either the Beranda text or balance to be visible
      await this.waitForElement(this.dashboardHeader, { timeout: 5000 });
      return true;
    } catch (error) {
      // Fallback to check for balance container
      try {
        await this.waitForElement(this.balanceContainer, { timeout: 3000 });
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async getBalance() {
    await this.waitForElement(this.balanceAmount);
    const balanceText = await this.getText(this.balanceAmount);
    return balanceText;
  }

  async getFullBalanceDisplay() {
    await this.waitForElement(this.balanceSection);
    return await this.getText(this.balanceSection);
  }

  async getEquity() {
    await this.waitForElement(this.equityAmount);
    const equityText = await this.getText(this.equityAmount);
    return equityText;
  }

  async getFullEquityDisplay() {
    await this.waitForElement(this.equityContainer);
    const equityContainer = await this.page.locator(this.equityContainer).locator('..').locator('.fontnyadolar');
    return await equityContainer.textContent();
  }

  async navigateToTradeNow() {
    await this.waitForElement(this.tradeButton);
    await this.click(this.tradeButton);
  }

  async isTradeButtonVisible() {
    try {
      await this.waitForElement(this.tradeButton, { timeout: 3000 });
      return await this.isVisible(this.tradeButton);
    } catch (error) {
      return false;
    }
  }

  async isDashboardHeaderVisible() {
    try {
      return await this.isVisible(this.dashboardHeader);
    } catch (error) {
      return false;
    }
  }

  async waitForDashboardElements() {
    // Wait for key dashboard elements to load
    const promises = [
      this.waitForElement(this.balanceAmount, { timeout: 10000 }),
      this.waitForElement(this.equityAmount, { timeout: 10000 }),
      this.waitForElement(this.tradeButton, { timeout: 10000 })
    ];

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.log('Some dashboard elements failed to load:', error.message);
      return false;
    }
  }

  // Additional helper methods for dashboard verification
  async verifyDashboardContent() {
    const checks = {
      balanceVisible: await this.isVisible(this.balanceAmount),
      equityVisible: await this.isVisible(this.equityAmount),
      tradeButtonVisible: await this.isVisible(this.tradeButton)
    };

    return checks;
  }

  async getDashboardData() {
    await this.waitForDashboardElements();
    
    return {
      balance: await this.getBalance(),
      equity: await this.getEquity(),
      isDashboardLoaded: await this.isDashboardLoaded()
    };
  }
}