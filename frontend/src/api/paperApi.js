import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all papers, optionally filtered by department and/or year.
 */
export async function fetchPapers({ department, year } = {}) {
  const params = {};
  if (department) params.department = department;
  if (year) params.year = year;

  const response = await apiClient.get('/papers', { params });
  return response.data;
}

/**
 * Fetch a single paper by its ID.
 */
export async function fetchPaperById(id) {
  const response = await apiClient.get(`/papers/${id}`);
  return response.data;
}

/**
 * Execute a semantic search query with optional filters.
 */
export async function searchPapers(query, filters = {}) {
  const payload = {
    query,
    ...filters,
  };

  const response = await apiClient.post('/search', payload);
  return response.data;
}

/**
 * Fetch the list of unique departments for filter dropdowns.
 */
export async function fetchDepartments() {
  const response = await apiClient.get('/papers/meta/departments');
  return response.data;
}

/**
 * Fetch the min/max publication year range.
 */
export async function fetchYearRange() {
  const response = await apiClient.get('/papers/meta/years');
  return response.data;
}
