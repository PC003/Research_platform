import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchTopDepartments(limit = 10) {
  const response = await apiClient.get('/analytics/top-departments', { params: { limit } });
  return response.data;
}

export async function fetchTopJournals(limit = 10) {
  const response = await apiClient.get('/analytics/top-journals', { params: { limit } });
  return response.data;
}

export async function fetchPublicationTrends() {
  const response = await apiClient.get('/analytics/publication-trends');
  return response.data;
}

export async function fetchCitationDistribution() {
  const response = await apiClient.get('/analytics/citation-distribution');
  return response.data;
}

export async function fetchKeywordFrequency(limit = 50) {
  const response = await apiClient.get('/analytics/keyword-frequency', { params: { limit } });
  return response.data;
}

export async function fetchPaperTypeBreakdown() {
  const response = await apiClient.get('/analytics/paper-types');
  return response.data;
}

export async function fetchStudentsPerDepartment() {
  const response = await apiClient.get('/analytics/students-per-department');
  return response.data;
}

export async function fetchResearchGrowth() {
  const response = await apiClient.get('/analytics/research-growth');
  return response.data;
}
