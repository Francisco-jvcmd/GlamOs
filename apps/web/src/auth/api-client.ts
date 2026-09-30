export class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  private refreshPromise: Promise<string> | null = null;

  private async getHeaders(): Promise<Headers> {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const storedTokens = localStorage.getItem('glamos_tokens');
    if (storedTokens) {
      const { access_token } = JSON.parse(storedTokens);
      headers.set('Authorization', `Bearer ${access_token}`);
    }
    return headers;
  }

  private async handleResponse(response: Response, originalRequest: () => Promise<Response>): Promise<any> {
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'TOKEN_EXPIRED') {
        if (!this.refreshPromise) {
          this.refreshPromise = this.doRefresh();
        }
        await this.refreshPromise;
        const retryRes = await originalRequest();
        if (!retryRes.ok) throw new Error('Request failed after refresh');
        return retryRes.json();
      }
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  private async doRefresh(): Promise<string> {
    try {
      const storedTokens = localStorage.getItem('glamos_tokens');
      if (!storedTokens) throw new Error('No tokens');
      const { refresh_token } = JSON.parse(storedTokens);
      
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token })
      });
      
      if (!res.ok) {
        localStorage.removeItem('glamos_tokens');
        window.location.href = '/login';
        throw new Error('Refresh failed');
      }
      
      const data = await res.json();
      localStorage.setItem('glamos_tokens', JSON.stringify({
        access_token: data.access_token,
        refresh_token
      }));
      return data.access_token;
    } finally {
      this.refreshPromise = null;
    }
  }

  async get(path: string) {
    const req = async () => fetch(`${this.baseUrl}${path}`, { headers: await this.getHeaders() });
    const res = await req();
    const data = await this.handleResponse(res, req);
    return { data };
  }

  async post(path: string, body: any) {
    const req = async () => fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(body)
    });
    const res = await req();
    const data = await this.handleResponse(res, req);
    return { data };
  }
}

export const apiClient = new ApiClient();
