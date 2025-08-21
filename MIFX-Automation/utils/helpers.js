export class Helpers {
  static async waitForPageLoad(page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  static parseBalance(balanceText) {
    // Remove currency symbols and extract numeric value
    return parseFloat(balanceText.replace(/[^0-9.-]/g, ''));
  }

  static generateTestData() {
    return {
      timestamp: new Date().toISOString(),
      randomAmount: Math.floor(Math.random() * 100) + 10,
      randomStopLoss: (Math.random() * 0.1 + 1.05).toFixed(4),
      randomTakeProfit: (Math.random() * 0.1 + 1.1).toFixed(4)
    };
  }
}