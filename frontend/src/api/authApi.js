import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Login with email and password. Returns { access_token, token_type, user }.
 */
export async function login(email, password) {
  const response = await authClient.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Register a new user account. Returns { access_token, token_type, user }.
 */
export async function register(email, password, full_name) {
  const response = await authClient.post('/auth/register', {
    email,
    password,
    full_name,
  });
  return response.data;
}

/**
 * Fetch the currently authenticated user's profile.
 */
export async function fetchCurrentUser(token) {
  const response = await authClient.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
