import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchStudents, searchStudents } from '../api/studentApi.js';
import { fetchStudentDepartments, fetchBatches } from '../api/studentApi.js';
import Pagination from '../components/Pagination.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Load metadata
  useEffect(() => {
    fetchStudentDepartments().then(setDepartments).catch(() => {});
    fetchBatches().then(setBatches).catch(() => {});
  }, []);

  // Load students
  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (searchQuery.trim()) {
        data = await searchStudents(searchQuery, { page, limit: 20 });
      } else {
        data = await fetchStudents({
          department: filterDept || undefined,
          batch: filterBatch || undefined,
          page,
          limit: 20,
        });
      }
      setStudents(data.items || []);
      setTotalPages(data.pages || 0);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load students.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterDept, filterBatch, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadStudents();
  }

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-sm text-gray-500">
          Browse {total.toLocaleString()} undergraduate researchers
        </p>
      </div>

      {/* Search + filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search students by name, department, or ID..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </form>
        <select
          value={filterDept}
          onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterBatch}
          onChange={(e) => { setFilterBatch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Student list */}
      {isLoading ? (
        <LoadingSkeleton count={5} />
      ) : students.length === 0 ? (
        <EmptyState message="No students found." suggestion="Try a different search or filter." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Link
                key={student.student_id}
                to={`/students/${student.student_id}`}
                className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={student.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.student_name)}&size=80&background=random`}
                    alt={student.student_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {student.student_name}
                    </h3>
                    <p className="truncate text-xs text-gray-500">
                      {student.student_id}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {student.department}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {student.papers_count} papers
                  </span>
                  {student.batch && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                      {student.batch}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Pagination
              page={page}
              pages={totalPages}
              total={total}
              onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default StudentsPage;
