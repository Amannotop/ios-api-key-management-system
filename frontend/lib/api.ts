import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/api/admin/login', { username, password });
    return data;
  },
  refresh: async () => {
    const { data } = await api.post('/api/admin/refresh');
    return data;
  },
};

export const keysApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; tier?: string }) => {
    const { data } = await api.get('/api/admin/keys', { params });
    return data;
  },
  create: async (expiresAt: string, maxDevices: number, isTrial?: boolean, trialDurationHours?: number, tier?: string, count?: number, allowedIPs?: string[], bundleIds?: string[]) => {
    const { data } = await api.post('/api/admin/keys', { expiresAt, maxDevices, isTrial, trialDurationHours, tier, count, allowedIPs, bundleIds });
    return data;
  },
  update: async (id: string, body: { expiresAt?: string; maxDevices?: number; status?: string; tier?: string; allowedIPs?: string[]; bundleIds?: string[] }) => {
    const { data } = await api.patch(`/api/admin/keys/${id}`, body);
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/api/admin/keys/${id}`);
  },
  getDevices: async (id: string) => {
    const { data } = await api.get(`/api/admin/keys/${id}/devices`);
    return data;
  },
  resetDevices: async (id: string) => {
    const { data } = await api.post(`/api/admin/keys/${id}/reset`);
    return data;
  },
  convertTrial: async (id: string, expiresAt?: string, maxDevices?: number, tier?: string) => {
    const { data } = await api.post(`/api/admin/keys/${id}/convert`, { expiresAt, maxDevices, tier });
    return data;
  },
  generateOffline: async (id: string, udid: string, bundleId: string) => {
    const { data } = await api.post(`/api/admin/keys/${id}/offline`, { udid, bundleId });
    return data;
  },
  clone: async (id: string, count?: number) => {
    const { data } = await api.post(`/api/admin/keys/${id}/clone`, { count });
    return data;
  },
  renew: async (id: string, expiresAt?: string, extendDays?: number) => {
    const { data } = await api.post(`/api/admin/keys/${id}/renew`, { expiresAt, extendDays });
    return data;
  },
  getExpiring: async (days?: number) => {
    const { data } = await api.get('/api/admin/keys/expiring', { params: { days } });
    return data;
  },
  import: async (keys: any[]) => {
    const { data } = await api.post('/api/admin/keys/import', { keys });
    return data;
  },
  export: async (params?: { status?: string; tier?: string; search?: string }) => {
    const { data } = await api.get('/api/admin/keys/export', { params });
    return data;
  },
  exportCsv: async (params?: { status?: string; tier?: string; search?: string }) => {
    const { data } = await api.get('/api/admin/keys/export/csv', { params, responseType: 'blob' });
    return data;
  },
};

export const logsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const { data } = await api.get('/api/admin/logs', { params });
    return data;
  },
};

export const statsApi = {
  get: async () => {
    const { data } = await api.get('/api/admin/stats');
    return data;
  },
};

export const webhooksApi = {
  getAll: async () => {
    const { data } = await api.get('/api/webhooks');
    return data;
  },
  create: async (url: string, events?: string[], secret?: string) => {
    const { data } = await api.post('/api/webhooks', { url, events, secret });
    return data;
  },
  update: async (id: string, body: { events?: string[]; active?: boolean }) => {
    const { data } = await api.patch(`/api/webhooks/${id}`, body);
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/api/webhooks/${id}`);
  },
  test: async (id: string) => {
    const { data } = await api.post(`/api/webhooks/test/${id}`);
    return data;
  },
};

export const apiKeysApi = {
  getAll: async () => {
    const { data } = await api.get('/api/admin/api-keys');
    return data;
  },
  create: async (name: string, expiresAt?: string) => {
    const { data } = await api.post('/api/admin/api-keys', { name, expiresAt });
    return data;
  },
  delete: async (keyId: string) => {
    await api.delete(`/api/admin/api-keys/${keyId}`);
  },
};

export const auditApi = {
  getAll: async (params?: { page?: number; limit?: number; action?: string; adminId?: string }) => {
    const { data } = await api.get('/api/admin/audit', { params });
    return data;
  },
};

export const usageApi = {
  getStats: async (keyId: string, days?: number) => {
    const { data } = await api.get(`/api/admin/keys/${keyId}/usage`, { params: { days } });
    return data;
  },
  getAll: async (days?: number) => {
    const { data } = await api.get('/api/admin/usage', { params: { days } });
    return data;
  },
};

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          }, reject: (err) => reject(err) });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await authApi.refresh();
        Cookies.set('token', accessToken, { expires: 1, sameSite: 'strict' });
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null);
        return api(originalRequest);
      } catch {
        processQueue(error);
        Cookies.remove('token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const ipWhitelistApi = {
  getAll: async () => {
    const { data } = await api.get('/api/admin/ip-whitelist');
    return data;
  },
  add: async (ip: string, description?: string) => {
    const { data } = await api.post('/api/admin/ip-whitelist', { ip, description });
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/api/admin/ip-whitelist/${id}`);
    return data;
  },
};

export const packagesApi = {
  getAll: async () => {
    const { data } = await api.get('/api/admin/packages');
    return data;
  },
  create: async (bundleId: string, name: string, displayName?: string, iconUrl?: string) => {
    const { data } = await api.post('/api/admin/packages', { bundleId, name, displayName, iconUrl });
    return data;
  },
  update: async (id: string, bundleId: string, name: string, displayName?: string, iconUrl?: string, isActive?: boolean) => {
    const { data } = await api.patch(`/api/admin/packages/${id}`, { bundleId, name, displayName, iconUrl, isActive });
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/api/admin/packages/${id}`);
    return data;
  },
};

export default api;