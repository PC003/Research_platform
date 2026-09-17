import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Image, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import * as api from '../services/api';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('');
  const [batch, setBatch] = useState('');
  const [schools, setSchools] = useState([]);
  const [batches, setBatches] = useState([]);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listStudents({
        search: search || undefined,
        school: school || undefined,
        batch: batch || undefined,
        limit,
        offset: page * limit,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  }, [search, school, batch, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    api.listSchools().then(setSchools).catch(console.error);
    api.getBatches().then(setBatches).catch(console.error);
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{total} student{total !== 1 ? 's' : ''} in local database</p>
        </div>
        <Link to="/students/add" className="btn btn-primary">+ Add Student</Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or ID..."
            className="form-input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={school}
            onChange={e => { setSchool(e.target.value); setPage(0); }}
            className="form-input w-44"
          >
            <option value="">All Schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={batch}
            onChange={e => { setBatch(e.target.value); setPage(0); }}
            className="form-input w-36"
          >
            <option value="">All Batches</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state py-16">
            <Users className="w-12 h-12" />
            <h3>No students found</h3>
            <p>{search || school || batch ? 'Try adjusting your search or filters.' : 'Import an Excel file or add students manually.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>School</th>
                <th>Batch</th>
                <th>Photo</th>
                <th>Poster</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr
                  key={s.student_id}
                  onClick={() => navigate(`/students/${s.student_id}`)}
                  className="cursor-pointer"
                >
                  <td>
                    <span className="font-mono text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                      {s.student_id}
                    </span>
                  </td>
                  <td className="font-medium">{s.student_name}</td>
                  <td className="text-gray-500">{s.school || '—'}</td>
                  <td className="text-gray-500">{s.batch || '—'}</td>
                  <td>
                    {s.photo_path
                      ? <span className="badge badge-valid">✓</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td>
                    {s.poster_path
                      ? <span className="badge badge-info">Generated</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-gray-400">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
