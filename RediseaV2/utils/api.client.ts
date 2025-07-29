import { APIRequestContext, request } from '@playwright/test';

export class ApiClient {
  private context: APIRequestContext;
  private baseURL: string;
  private cookies: string[] = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async init(): Promise<void> {
    this.context = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async dispose(): Promise<void> {
    await this.context?.dispose();
  }

  private getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }

    return headers;
  }

  private updateCookies(setCookieHeaders?: string[] | string): void {
    if (!setCookieHeaders) return;

    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0];
      const existingIndex = this.cookies.findIndex(c => c.startsWith(cookieName + '='));
      const newCookie = cookie.split(';')[0];

      if (existingIndex >= 0) {
        this.cookies[existingIndex] = newCookie;
      } else {
        this.cookies.push(newCookie);
      }
    });
  }

  private async handleResponse<T>(response: any): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    this.updateCookies(response.headers()['set-cookie']);
    const body = await response.json().catch(() => ({} as T));
    return {
      status: response.status(),
      body,
      headers: response.headers()
    };
  }

  async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const response = await this.context.get(endpoint, {
      headers: this.getHeaders(headers)
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const response = await this.context.post(endpoint, {
      data: JSON.stringify(data),
      headers: this.getHeaders(headers)
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const response = await this.context.patch(endpoint, {
      data: JSON.stringify(data),
      headers: this.getHeaders(headers)
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const response = await this.context.put(endpoint, {
      data: JSON.stringify(data),
      headers: this.getHeaders(headers)
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, headers: Record<string, string> = {}): Promise<{ status: number; body: T; headers: Record<string, string> }> {
    const response = await this.context.delete(endpoint, {
      headers: this.getHeaders(headers)
    });
    return this.handleResponse<T>(response);
  }

  clearCookies(): void {
    this.cookies = [];
  }
}
