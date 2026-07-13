const API_BASE = '/backupcentral/api';

function getToken() {
  return localStorage.getItem('bc_token');
}

function setToken(token) {
  localStorage.setItem('bc_token', token);
}

function clearToken() {
  localStorage.removeItem('bc_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/backupcentral/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    login: (username, password) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    verify: () => request('/auth/verify'),
  },
  dashboard: {
    get: () => request('/dashboard'),
  },
  containers: {
    list: () => request('/containers'),
    get: (id) => request(`/containers/${id}`),
    sync: () => request('/containers/sync', { method: 'POST' }),
  },
  backups: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/backups${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/backups/${id}`),
    create: (data) => request('/backups', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/backups/${id}`, { method: 'DELETE' }),
    download: (id) => request(`/backups/${id}/download`),
  },
  restore: {
    logs: () => request('/restore/logs'),
    create: (data) => request('/restore', { method: 'POST', body: JSON.stringify(data) }),
    migration: (portainerId) => request(`/restore/migration/${portainerId}`),
  },
  schedules: {
    list: () => request('/schedules'),
    create: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),
  },
  settings: {
    list: () => request('/settings'),
    update: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  },
  remoteConnections: {
    list: () => request('/remote-connections'),
    get: (id) => request(`/remote-connections/${id}`),
    create: (data) => request('/remote-connections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/remote-connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/remote-connections/${id}`, { method: 'DELETE' }),
    test: (id) => request(`/remote-connections/${id}/test`, { method: 'POST' }),
  },
  remoteBackups: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/remote-backups${qs ? `?${qs}` : ''}`);
    },
    create: (data) => request('/remote-backups', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/remote-backups/${id}`, { method: 'DELETE' }),
  },
  dbConnections: {
    list: () => request('/db-connections'),
    get: (id) => request(`/db-connections/${id}`),
    create: (data) => request('/db-connections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/db-connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/db-connections/${id}`, { method: 'DELETE' }),
    test: (id) => request(`/db-connections/${id}/test`, { method: 'POST' }),
    databases: (id) => request(`/db-connections/${id}/databases`),
  },
  dbBackups: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/db-backups${qs ? `?${qs}` : ''}`);
    },
    create: (data) => request('/db-backups', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/db-backups/${id}`, { method: 'DELETE' }),
  },
};

export { getToken, setToken, clearToken };
