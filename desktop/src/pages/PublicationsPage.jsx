import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, FileText, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import * as api from '../services/api';

export default function PublicationsPage() {
  const navigate = useNavigate();
  const [publications, setPublications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [journal, setJournal] = useState('');
  const [pubType, setPubType] = useState('');
  const [year, setYear] = useState('');
  
  const [journals, setJournals] = useState([]);
  const [pubTypes, setPubTypes] = useState([]);
  const [months, setMonths] = useState([]);
  
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchPublications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listPublications({
        search: search || undefined,
        journal: journal || undefined,
        publication_type: pubType || undefined,
        publication_year: year ? parseInt(year) : undefined,
        limit,
        offset: page * limit,
      });
      setPublications(res.publications);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch publications:', err);
    } finally {
      setLoading(false);
    }
  }, [search, journal, pubType, year, page]);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  useEffect(() => {
    api.listJournals().then(setJournals).catch(console.error);
    api.listPublicationTypes().then(setPubTypes).catch(console.error);
    api.listPublicationMonths().then(setMonths).catch(console.error);
  }, []);

  const totalPages = Math.ceil(total / limit);

  // Extract unique years from months for the filter
  const years = [...new Set(months.map(m => m.year))].sort((a, b) => b - a);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Publications</h1>
          <p className="text-sm text-gray-500 mt-1">{total} publication{total !== 1 ? 's' : ''} in local database</p>
        </div>
        <Link to="/publications/add" className="btn btn-primary">+ Add Publication</Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by title, DOI, or journal..."
            className="form-input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={journal}
            onChange={e => { setJournal(e.target.value); setPage(0); }}
            className="form-input w-44"
          >
            <option value="">All Journals</option>
            {journals.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <select
            value={pubType}
            onChange={e => { setPubType(e.target.value); setPage(0); }}
            className="form-input w-40"
          >
            <option value="">All Types</option>
            {pubTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={year}
            onChange={e => { setYear(e.target.value); setPage(0); }}
            className="form-input w-32"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : publications.length === 0 ? (
          <div className="empty-state py-16">
            <BookOpen className="w-12 h-12" />
            <h3>No publications found</h3>
            <p>{search || journal || pubType || year ? 'Try adjusting your search or filters.' : 'Import an Excel file or add publications manually.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Journal</th>
                <th>Type</th>
                <th>Year</th>
                <th>Impact Factor</th>
                <th>Q Rank</th>
                <th>Authors</th>
                <th>Students</th>
                <th>DOI</th>
              </tr>
            </thead>
            <tbody>
              {publications.map(({ publication: pub, authors, student_count }) => (
                <tr key={pub.id} onClick={() => navigate(`/publications/${pub.id}`)}>
                  <td className="font-medium max-w-xs truncate" title={pub.title}>{pub.title}</td>
                  <td className="truncate max-w-[150px]" title={pub.journal}>{pub.journal || '-'}</td>
                  <td>
                    <span className="badge badge-gray">{pub.publication_type || 'Unknown'}</span>
                  </td>
                  <td>{pub.publication_year || '-'}</td>
                  <td>{pub.impact_factor ? parseFloat(pub.impact_factor).toFixed(2) : '-'}</td>
                  <td>
                    {pub.q_rank ? (
                      <span className={`badge ${pub.q_rank.toLowerCase() === 'q1' ? 'badge-valid' : pub.q_rank.toLowerCase() === 'q2' ? 'badge-blue' : 'badge-gray'}`}>
                        {pub.q_rank}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="flex -space-x-2">
                      {authors.slice(0, 3).map((a, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-brand-100 border border-white flex items-center justify-center text-[10px] font-bold text-brand-700" title={a.author_name}>
                          {a.author_name.charAt(0)}
                        </div>
                      ))}
                      {authors.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                          +{authors.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${student_count > 0 ? 'badge-blue' : 'badge-gray'}`}>
                      {student_count} student{student_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500 truncate max-w-[120px]">{pub.doi || '-'}</td>
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
