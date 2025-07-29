# API Automation Framework dengan Playwright TypeScript

Framework profesional untuk automasi testing API menggunakan Playwright dan TypeScript.

## 🚀 Fitur Utama

- **Arsitektur Modular**: Service layer pattern untuk maintainability
- **Type Safety**: Full TypeScript support dengan interface yang kuat
- **Flexible Configuration**: Environment-based configuration
- **Comprehensive Assertions**: Custom assertion helpers
- **Test Data Management**: Dynamic test data generation
- **Cookie Management**: Automatic session handling
- **Retry Logic**: Built-in retry mechanism
- **Performance Testing**: Load testing capabilities
- **Parallel Execution**: Concurrent test execution
- **Rich Reporting**: HTML, JSON, dan JUnit reports

## 📁 Struktur Project

```
├── fixtures/
│   └── api.fixture.ts          # Test fixtures
├── services/
│   ├── auth.service.ts         # Authentication services
│   ├── company.service.ts      # Company management services
│   └── stakeholder.service.ts  # Stakeholder services
├── tests/
│   ├── auth/                   # Authentication tests
│   ├── company/                # Company tests
│   ├── stakeholder/            # Stakeholder tests
│   ├── integration/            # E2E integration tests
│   └── performance/            # Performance tests
├── types/
│   └── api.types.ts            # TypeScript interfaces
├── utils/
│   ├── api.client.ts           # HTTP client wrapper
│   ├── assertions.ts           # Custom assertions
│   ├── test.data.ts            # Test data generators
│   ├── test.config.ts          # Test configuration
│   └── test.helpers.ts         # Test utilities
├── playwright.config.ts        # Playwright configuration
└── .env.example               # Environment variables template
```

## 🛠️ Setup

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit file `.env`:
```env
BASE_URL=http://localhost:8080
TEMP_CREATE_USER_TOKEN=your-temp-token-here
TEST_EMAIL=test@example.com
TEST_PASSWORD=sayang1234
RECAPTCHA_BYPASS=true
```

### 3. Install Playwright Browsers
```bash
npx playwright install
```

## 🧪 Menjalankan Tests

### Basic Commands
```bash
# Jalankan semua tests
npm test

# Jalankan dengan UI mode
npm run test:ui

# Jalankan dengan headed browser
npm run test:headed

# Debug mode
npm run test:debug
```

### Tag-based Testing
```bash
# Authentication tests
npm run test:auth

# Company tests
npm run test:company

# Stakeholder tests
npm run test:stakeholder
```

### Custom Test Execution
```bash
# Jalankan test spesifik
npx playwright test tests/auth/login.spec.ts

# Jalankan dengan grep pattern
npx playwright test --grep "should login successfully"

# Jalankan dengan specific project
npx playwright test --project=api-tests
```

## 📊 Reporting

```bash
# Generate dan buka HTML report
npm run test:report
```

Reports tersedia dalam format:
- HTML (interactive)
- JSON (untuk CI/CD integration)
- JUnit XML (untuk test management tools)

## 🔧 Penggunaan Framework

### 1. Basic API Testing
```typescript
import { test, expect } from '../fixtures/api.fixture';

test('should login successfully', async ({ authService }) => {
  const response = await authService.login({
    email: 'test@example.com',
    password: 'password123',
    bypassCaptcha: true
  });
  
  expect(response.status).toBe(200);
  expect(response.body.user).toBeDefined();
});
```

### 2. Custom Assertions
```typescript
import { ApiAssertions } from '../utils/assertions';

test('should handle unauthorized access', async ({ authService }) => {
  const response = await authService.validateToken();
  ApiAssertions.expectUnauthorizedResponse(response);
});
```

### 3. Test Data Generation
```typescript
import { TestDataGenerator } from '../utils/test.data';

test('should create user with generated data', async ({ authService }) => {
  const userData = {
    name: 'Test User',
    email: TestDataGenerator.generateEmail(),
    password: TestDataGenerator.generatePassword()
  };
  
  const response = await authService.createUser(userData, 'temp-token');
  expect(response.status).toBe(201);
});
```

## 🎯 Best Practices

### 1. Test Organization
- Gunakan tags untuk kategorisasi (@auth, @company, @stakeholder)
- Pisahkan unit tests, integration tests, dan performance tests
- Implementasikan setup dan teardown yang proper

### 2. Data Management
- Gunakan dynamic test data generation
- Implement proper test data cleanup
- Isolasi test data antar test cases

### 3. Error Handling
- Implement comprehensive error assertions
- Handle different HTTP status codes
- Provide meaningful error messages

### 4. Performance
- Implement concurrent test execution
- Use proper timeouts and retries
- Monitor test execution time

## 🔄 CI/CD Integration

Framework ini mendukung integration dengan:
- GitHub Actions
- Jenkins
- GitLab CI
- Azure DevOps

Contoh GitHub Actions:
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Extending Framework

### 1. Menambah Service Baru
```typescript
// services/new.service.ts
export class NewService {
  constructor(private apiClient: ApiClient) {}
  
  async newMethod(data: any) {
    return await this.apiClient.post('/v1/new-endpoint', data);
  }
}
```

### 2. Menambah Custom Assertions
```typescript
// utils/assertions.ts
export class ApiAssertions {
  static expectCustomResponse(response: any): void {
    expect(response.status).toBe(200);
    expect(response.body.customField).toBeDefined();
  }
}
```

### 3. Menambah Test Utilities
```typescript
// utils/custom.helpers.ts
export class CustomHelpers {
  static async customUtility(): Promise<void> {
    // Implementation
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Pastikan API server running
   - Check BASE_URL configuration

2. **Authentication Failures**
   - Verify credentials di .env
   - Check token expiration

3. **Rate Limiting**
   - Implement delays between requests
   - Use proper retry logic

4. **Environment Issues**
   - Verify all environment variables
   - Check network connectivity

## 📝 Contributing

1. Fork repository
2. Create feature branch
3. Implement tests untuk new features
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## 🤝 Support

Untuk pertanyaan atau issues:
- Create GitHub issue
- Contact development team
- Check documentation
```

Ini adalah framework yang lengkap dan profesional untuk automasi API testing dengan Playwright TypeScript. Framework ini menyediakan:

1. **Arsitektur yang Scalable** - Service layer pattern yang mudah diperluas
2. **Type Safety** - Full TypeScript support dengan interface yang kuat
3. **Comprehensive Testing** - Cover semua endpoint dari tech doc
4. **Professional Structure** - Organized code structure yang maintainable
5. **Rich Features** - Cookie management, retry logic, performance testing
6. **CI/CD Ready** - Siap untuk integration dengan pipeline CI/CD

Framework ini dapat dengan mudah diperluas untuk endpoint-endpoint baru sesuai kebutuhan development.
