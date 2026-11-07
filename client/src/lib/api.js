import axios from 'axios';
import { getAuthToken } from './authToken';

const REMOTE_API_BASE = 'https://collage.vaisacademy.com/shibhamConstruction/api';

const isDesktopContext =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    /electron/i.test(navigator.userAgent) ||
    Boolean(window.electronAPI?.isElectron));

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (isDesktopContext ? REMOTE_API_BASE : '/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

export default api;
