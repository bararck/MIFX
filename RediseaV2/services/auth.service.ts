import { ApiClient } from '../utils/api.client';
import {
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  CreateUserRequest,
  User
} from '../types/api.types';

interface ExtendedLoginRequest extends LoginRequest {
  bypassCaptcha?: boolean;
  recaptchaToken?: string;
}

export class AuthService {
  loginAsAdmin(): { token: any; } | PromiseLike<{ token: any; }> {
      throw new Error('Method not implemented.');
  }
  private currentToken: string | null = null;

  constructor(private apiClient: ApiClient) {}

  async login(loginData: ExtendedLoginRequest) {
    const response = await this.apiClient.post<{
      message: string;
      token: string;
      user: User;
    }>('/v1/auth/login', loginData);

    if (response.status === 200 && response.body.token) {
      this.currentToken = response.body.token;
    }

    return response;
  }

  async refreshToken() {
    return await this.apiClient.get<{ message: string; token: { expiredAt: string } }>(
      '/v1/auth/refresh'
    );
  }

  async validateToken() {
    return await this.apiClient.get<{ message: string; user: User }>('/v1/auth/me');
  }

  async createUser(userData: CreateUserRequest, tempToken: string) {
    console.log('Creating user with temp token:', tempToken.substring(0, 10) + '...');
    
    const response = await this.apiClient.post<{ message: string; user: User }>(
      '/v1/user',
      userData,
      { 'X-Temp-Create-User-Token': tempToken }
    );

    console.log('CreateUser response status:', response.status);
    return response;
  }

  async createUserWithoutToken(userData: CreateUserRequest) {
    console.log('Creating user without token');
    
    const response = await this.apiClient.post<{ message: string }>(
      '/v1/user',
      userData
    );

    console.log('CreateUserWithoutToken response status:', response.status);
    return response;
  }

  async createForgotPasswordToken(data: ForgotPasswordRequest) {
    return await this.apiClient.post<{ message: string }>('/v1/forgot-password', data);
  }

  async checkForgotPasswordToken(token: string, email: string) {
    return await this.apiClient.get<{ message: string }>(
      `/v1/forgot-password?token=${token}&email=${email}`
    );
  }

  async resetPassword(data: ResetPasswordRequest) {
    return await this.apiClient.post<{ message: string }>('/v1/reset-password', data);
  }

  async setCompany(companyId: string) {
    return await this.apiClient.post<{ message: string; user: User }>(
      '/v1/auth/user/set-company',
      { id: companyId }
    );
  }

  setToken(token: string) {
    this.currentToken = token;
  }

  getToken(): string | null {
    return this.currentToken;
  }

  clearToken() {
    this.currentToken = null;
  }
}