import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all papers with optional filters, sorting, and pagination.
 */
export async function fetchPapers({ department, school, year, sort, page, limit } = {}) {
  const params = {};
  if (department) params.department = department;
  if (school) params.school = school;
  if (year) params.year = year;
  if (sort) params.sort = sort;
  if (page) params.page = page;
  if (limit) params.limit = limit;

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
 * Execute a hybrid search query with optional filters and sorting.
 * Uses GET /papers/search endpoint.
 */
export async function searchPapers(query, {
  mode = 'hybrid',
  department,
  school,
  year,
  year_from,
  year_to,
  author,
  journal,
  conference,
  paper_type,
  sort = 'relevance',
  page = 1,
  limit = 20,
} = {}) {
  const params = { q: query, mode, sort, page, limit };
  if (department) params.department = department;
  if (school) params.school = school;
  if (year) params.year = year;
  if (year_from) params.year_from = year_from;
  if (year_to) params.year_to = year_to;
  if (author) params.author = author;
  if (journal) params.journal = journal;
  if (conference) params.conference = conference;
  if (paper_type) params.paper_type = paper_type;

  const response = await apiClient.get('/papers/search', { params });
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
 * Fetch the list of unique schools for filter dropdowns.
 */
export async function fetchSchools() {
  const response = await apiClient.get('/papers/meta/schools');
  return response.data;
}

/**
 * Fetch the list of unique journals for filter dropdowns.
 */
export async function fetchJournals() {
  const response = await apiClient.get('/papers/meta/journals');
  return response.data;
}

/**
 * Fetch the list of unique paper types.
 */
export async function fetchPaperTypes() {
  const response = await apiClient.get('/papers/meta/paper-types');
  return response.data;
}

/**
 * Fetch the min/max publication year range.
 */
export async function fetchYearRange() {
  const response = await apiClient.get('/papers/meta/years');
  return response.data;
}
