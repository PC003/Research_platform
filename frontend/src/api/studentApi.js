import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch all students with optional filters and pagination.
 */
export async function fetchStudents({ department, school, batch, page, limit } = {}) {
  const params = {};
  if (department) params.department = department;
  if (school) params.school = school;
  if (batch) params.batch = batch;
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await apiClient.get('/students', { params });
  return response.data;
}

/**
 * Fetch a single student by ID.
 */
export async function fetchStudentById(id) {
  const response = await apiClient.get(`/students/${id}`);
  return response.data;
}

/**
 * Fetch papers by a specific student.
 */
export async function fetchStudentPapers(studentId, { page, limit } = {}) {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await apiClient.get(`/students/${studentId}/papers`, { params });
  return response.data;
}

/**
 * Search students by name, department, or email.
 */
export async function searchStudents(query, { page, limit } = {}) {
  const params = { q: query };
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await apiClient.get('/students/search', { params });
  return response.data;
}

/**
 * Fetch unique student departments.
 */
export async function fetchStudentDepartments() {
  const response = await apiClient.get('/students/meta/departments');
  return response.data;
}

/**
 * Fetch unique batches.
 */
export async function fetchBatches() {
  const response = await apiClient.get('/students/meta/batches');
  return response.data;
}
