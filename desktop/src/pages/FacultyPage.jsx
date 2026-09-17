import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import * as api from '../services/api';

export default function FacultyPage() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listFaculty({
        search: search || undefined,
        limit,
        offset: page * limit,
      });
      setFaculty(res.faculty);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch faculty:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Faculty Members</h1>
          <p className="text-sm text-gray-500 mt-1">{total} faculty member{total !== 1 ? 's' : ''} in local database</p>
        </div>
        <Link to="/faculty/add" className="btn btn-primary">+ Add Faculty</Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or school..."
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : faculty.length === 0 ? (
          <div className="empty-state py-16">
            <GraduationCap className="w-12 h-12" />
            <h3>No faculty members found</h3>
            <p>{search ? 'Try adjusting your search.' : 'Faculty members will appear here when imported.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>School</th>
                <th>Added On</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map(f => (
                <tr key={f.id} className="cursor-default hover:bg-gray-50">
                  <td className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                        {f.name.charAt(0)}
                      </div>
                      {f.name}
                    </div>
                  </td>
                  <td>{f.school || '-'}</td>
                  <td className="text-sm text-gray-500">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button 
                className="btn btn-secondary py-1.5 px-3"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                className="btn btn-secondary py-1.5 px-3"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
