export class TestData {
  static credentials = {
    valid: {
      email: process.env.VALID_EMAIL || 'testmifx@mailnesia.com',
      password: process.env.VALID_PASSWORD || 'Test1234.'
    },
    invalid: {
      email: process.env.VALID_EMAIL || 'testmifx@mailnesia.com',
      password: process.env.INVALID_PASSWORD || 'TestPass321!'
    }
  };

  static tradeData = {
    asset: 'EUR/USD',
    amount: '$10',
    stopLoss: '1.0500',
    takeProfit: '1.1000'
  };

  static urls = {
    clientArea: '/clientarea',
    dashboard: '/clientarea/dashboard',
    tradeNow: '/clientarea/trade-now'
  };
}
