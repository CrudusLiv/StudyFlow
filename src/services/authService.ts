import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface TokenData {
  exp: number;
  userId: string;
  userKey: string;
  iat: number;
}

export const authService = {
  /**
   * Get the current token from local storage
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Save token to local storage
   */
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  },

  /**
   * Remove token from local storage
   */
  removeToken(): void {
    localStorage.removeItem('token');
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = this.parseJwt(token);
      // Check if token is expired
      return payload.exp * 1000 > Date.now();
    } catch (e) {
      return false;
    }
  },

  /**
   * Parse JWT token
   */
  parseJwt(token: string): TokenData {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      throw new Error('Invalid token format');
    }
  },

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });
      
      if (response.data && response.data.token) {
        this.saveToken(response.data.token);
        return response.data.token;
      }
      throw new Error('No token received');
    } catch (error) {
      this.removeToken(); // Clear invalid token
      console.error('Failed to refresh token:', error);
      throw error;
    }
  },

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any): void {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      this.removeToken();
      // Redirect to login page
      window.location.href = '/access?reason=session_expired';
    }
  },

  /**
   * Get authenticated axios instance with token refresh handling
   */
  getAuthAxios() {
    const authAxios = axios.create();
    
    // Add request interceptor to add token
    authAxios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for token refresh
    authAxios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is due to an expired token and we haven't tried to refresh yet
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          this.getToken()
        ) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const newToken = await this.refreshToken();
            
            // Update the authorization header
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the original request
            return authAxios(originalRequest);
          } catch (refreshError) {
            // If token refresh fails, redirect to login
            this.handleAuthError(refreshError);
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return authAxios;
  }
};
