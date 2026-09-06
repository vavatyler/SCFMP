import axios from 'axios';
import { ACTIVE_ORGANIZATION_STORAGE_KEY } from '../config/organizationContext';

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const apiClient = axios.create({ baseURL: API_URL });

// Attach the access token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('scfmp_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const organizationId = Number(localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY));
  if (Number.isInteger(organizationId) && organizationId > 0) {
    config.headers['X-Organization-Id'] = String(organizationId);
  }
  return config;
});

// If a request comes back 401, try refreshing the token once before giving up
let isRefreshing = false;
let refreshQueue = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('scfmp_refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;

        localStorage.setItem('scfmp_access_token', newAccessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('scfmp_refresh_token', data.data.refreshToken);
        }
        refreshQueue.forEach((p) => p.resolve(newAccessToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((p) => p.reject(refreshError));
        refreshQueue = [];
        localStorage.removeItem('scfmp_access_token');
        localStorage.removeItem('scfmp_refresh_token');
        localStorage.removeItem('scfmp_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
