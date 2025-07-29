export class TestConfig {
  static readonly DEFAULT_TIMEOUT = 30000;
  static readonly RETRY_COUNT = 3;
  static readonly CONCURRENT_REQUESTS = 10;
  
  static readonly API_ENDPOINTS = {
    AUTH: {
      LOGIN: '/v1/auth/login',
      REFRESH: '/v1/auth/refresh',
      VALIDATE: '/v1/auth/me',
      FORGOT_PASSWORD: '/v1/forgot-password',
      RESET_PASSWORD: '/v1/reset-password',
      SET_COMPANY: '/v1/auth/user/set-company'
    },
    USER: {
      CREATE: '/v1/user'
    },
    COMPANY: {
      GROUP: '/v1/company-group',
      ADMIN_GROUP: '/v1/admin/company-group',
      ADMIN_COMPANY: '/v1/admin/company',
      COMPANY: '/v1/company'
    },
    STAKEHOLDER: {
      ADMIN: '/v1/admin/stakeholder',
      PUBLIC: '/v1/stakeholder'
    },
    CREW: {
      COMPONENT: '/v1/crew/component',
      COMPONENT_BY_CATEGORY: '/v1/crew/component/:category', 
      COMPONENT_ALL_BY_CATEGORY: '/v1/crew/component/:category/all'
    }
  };

  static readonly HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429
  };
}
