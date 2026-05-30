import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const STORAGE_KEY = 'smart_library_auth';

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as { token?: string };
    if (parsed.token) {
      api.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
    }
  }
} catch {
  // Ignore storage parsing errors and continue without a token.
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

