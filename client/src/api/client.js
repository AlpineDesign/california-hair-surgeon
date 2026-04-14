import axios from 'axios';
import { getApiScopeAccountId } from './scope';

const client = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080',
});

client.interceptors.request.use((config) => {
  const stored = localStorage.getItem('surgassist_user');
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  const scope = getApiScopeAccountId();
  if (scope) {
    config.headers['X-Scope-Account-Id'] = scope;
  } else if (config.headers['X-Scope-Account-Id']) {
    delete config.headers['X-Scope-Account-Id'];
  }
  return config;
});

// On 401, clear stale session and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('surgassist_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default client;
