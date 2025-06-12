import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import environment from '../config/environment';

/**
 * Centralized HTTP client with interceptors for authentication and error handling
 */
class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || environment.BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any default headers or authentication tokens here
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Handle unauthorized access
          console.error('Unauthorized access - token may be expired');
        } else if (error.response?.status === 403) {
          // Handle forbidden access
          console.error('Forbidden access - insufficient permissions');
        } else if (error.response?.status >= 500) {
          // Handle server errors
          console.error('Server error occurred');
        }

        return Promise.reject(error);
      }
    );
  }

  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // Set authorization header
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization header
  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Set custom header
  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  // Remove custom header
  removeHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }

  // Get the underlying axios instance for advanced usage
  getInstance(): AxiosInstance {
    return this.client;
  }
}

// Create default instance
const httpClient = new HttpClient();

// Export both the class and default instance
export { HttpClient };
export default httpClient;

// Utility functions for common API patterns
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
};

// Helper for handling API responses
export const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }
  throw new Error(`API request failed with status ${response.status}`);
};

// Helper for handling API errors
export const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || error.response.statusText || 'API request failed';
    throw new Error(`API Error (${error.response.status}): ${message}`);
  } else if (error.request) {
    // Request was made but no response received
    throw new Error('Network error: No response received from server');
  } else {
    // Something else happened
    throw new Error(`Request error: ${error.message}`);
  }
};
