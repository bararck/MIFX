import { BasePage } from './BasePage.js';

export class TradePage extends BasePage {
  constructor(page) {
    super(page);
    // Updated selectors based on your HTML structure
    this.buyButton = '#direction-buy';
    this.sellButton = '#direction-sell';
    this.orderButton = 'button[name="btnSubmit"][value="order"]';
    this.takeProfitInput = '#tp';
    this.stopLossInput = '#sl';
    this.quantityInput = 'input[name="quantity"]';
    this.takeProfitToggle = '.slider.round';
    this.stopLossToggle = '.slider.round';
    
    // Keep original selectors as fallbacks
    this.assetSelector = '.asset-selector, [name="asset"]';
    this.amountInput = '[name="amount"], .amount-input';
    this.tradeConfirmation = '.trade-confirmation, .trade-success';
    this.tradeError = '.trade-error, .error-message';
    
    // Total Profit/Loss selector
    this.totalProfitLoss = '.totalPl';
  }

  async selectBuyDirection() {
    await this.click(this.buyButton);
    // Use page.waitForTimeout instead of this.waitForTimeout
    await this.page.waitForTimeout(500);
  }

  async selectSellDirection() {
    await this.click(this.sellButton);
    // Use page.waitForTimeout instead of this.waitForTimeout
    await this.page.waitForTimeout(500);
  }

  async selectAsset(asset) {
    // Check if asset selector exists before trying to click
    if (await this.isVisible(this.assetSelector)) {
      await this.click(this.assetSelector);
      await this.click(`[data-asset="${asset}"], option[value="${asset}"]`);
    } else {
      console.log('Asset selector not found, skipping asset selection');
    }
  }

  async enterQuantity(quantity) {
    await this.fill(this.quantityInput, quantity.toString());
  }

  async enterAmount(amount) {
    await this.fill(this.amountInput, amount.toString());
  }

  async toggleTakeProfit() {
    // Find the specific take profit toggle - you may need to adjust this selector
    const takeProfitSection = await this.page.$('text=Take Profit');
    if (takeProfitSection) {
      const toggle = await takeProfitSection.locator('..').locator('.slider.round').first();
      await toggle.click();
    } else {
      // Fallback to first toggle
      const toggles = await this.page.$$('.slider.round');
      if (toggles.length > 0) {
        await toggles[0].click();
      }
    }
  }

  async setTakeProfit(value) {
    await this.fill(this.takeProfitInput, value.toString());
  }

  async toggleStopLoss() {
    // Find the specific stop loss toggle - you may need to adjust this selector
    const stopLossSection = await this.page.$('text=Stop Loss');
    if (stopLossSection) {
      const toggle = await stopLossSection.locator('..').locator('.slider.round').first();
      await toggle.click();
    } else {
      // Fallback to second toggle
      const toggles = await this.page.$$('.slider.round');
      if (toggles.length > 1) {
        await toggles[1].click();
      }
    }
  }

  async setStopLoss(value) {
    await this.fill(this.stopLossInput, value.toString());
  }

  async placeOrder() {
    await this.click(this.orderButton);
  }

  async placeBuyTrade() {
    await this.selectBuyDirection();
    await this.placeOrder();
  }

  async placeSellTrade() {
    await this.selectSellDirection();
    await this.placeOrder();
  }

  async isDirectionSelected(direction) {
    const selector = direction.toLowerCase() === 'buy' ? this.buyButton : this.sellButton;
    const element = await this.page.$(selector);
    
    if (!element) return false;
    
    // Check if the element has the active/selected class
    const className = await element.getAttribute('class');
    
    if (direction.toLowerCase() === 'buy') {
      return className.includes('blueProcessBg') || className.includes('selected') || className.includes('active');
    } else if (direction.toLowerCase() === 'sell') {
      // For sell button, check for different classes that indicate selection
      // You may need to adjust these based on what classes appear when sell is selected
      return className.includes('blueProcessBg') || className.includes('selected') || className.includes('active') || 
             className.includes('redProcessBg') || className.includes('sellSelected') || 
             !className.includes('directionDefault'); // Assuming directionDefault means not selected
    }
    
    return false;
  }

  async getTakeProfitValue() {
    return await this.page.inputValue(this.takeProfitInput);
  }

  async getStopLossValue() {
    return await this.page.inputValue(this.stopLossInput);
  }

  async getQuantityValue() {
    return await this.page.inputValue(this.quantityInput);
  }

  async isTakeProfitEnabled() {
    // Check if the take profit input is enabled/visible
    try {
      const input = await this.page.$(this.takeProfitInput);
      if (!input) return false;
      
      const isVisible = await input.isVisible();
      const isEnabled = await input.isEnabled();
      
      return isVisible && isEnabled;
    } catch (error) {
      return false;
    }
  }

  async isStopLossEnabled() {
    // Check if the stop loss input is enabled/visible
    try {
      const input = await this.page.$(this.stopLossInput);
      if (!input) return false;
      
      const isVisible = await input.isVisible();
      const isEnabled = await input.isEnabled();
      
      return isVisible && isEnabled;
    } catch (error) {
      return false;
    }
  }

  async modifyStopLoss(newValue) {
    if (!(await this.isStopLossEnabled())) {
      await this.toggleStopLoss();
    }
    await this.setStopLoss(newValue);
  }

  async modifyTakeProfit(newValue) {
    if (!(await this.isTakeProfitEnabled())) {
      await this.toggleTakeProfit();
    }
    await this.setTakeProfit(newValue);
  }

  async isTradeSuccessful() {
    try {
      await this.waitForElement(this.tradeConfirmation, 10000);
      return await this.isVisible(this.tradeConfirmation);
    } catch (error) {
      return false;
    }
  }

  async getTradeErrorMessage() {
    if (await this.isVisible(this.tradeError)) {
      return await this.getText(this.tradeError);
    }
    return null;
  }

  async waitForOrderButtonToBeEnabled() {
    await this.page.waitForFunction(() => {
      const button = document.querySelector('button[name="btnSubmit"][value="order"]');
      return button && !button.disabled;
    });
  }

  async isOrderButtonEnabled() {
    const button = await this.page.$(this.orderButton);
    if (!button) return false;
    
    const disabled = await button.getAttribute('disabled');
    return disabled === null;
  }

  // New method for getting total profit/loss
  async getTotalProfitLoss() {
    try {
      const element = await this.page.$(this.totalProfitLoss);
      if (element) {
        return await element.textContent();
      }
      return null;
    } catch (error) {
      console.log('Error getting total profit/loss:', error);
      return null;
    }
  }
}