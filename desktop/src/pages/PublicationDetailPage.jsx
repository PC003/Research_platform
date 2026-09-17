import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Calendar, FileText, Globe, Award, Users } from 'lucide-react';
import * as api from '../services/api';

export default function PublicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPublication = useCallback(async () => {
    try {
      const pubData = await api.getPublication(Number(id));
      setData(pubData);
    } catch (err) {
      console.error(err);
      setError('Publication not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPublication();
  }, [fetchPublication]);

  async function handleDelete() {
    if (!confirm('Delete this publication? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deletePublication(Number(id));
      navigate('/publications');
    } catch (err) {
      console.error(err);
      setError(err?.error || 'Failed to delete');
      setDeleting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (error || !data) return <div className="p-8 text-center text-red-500">{error}</div>;

  const { publication: pub, authors, student_count } = data;

  return (
    <div className="fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link to="/publications" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-600 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Publications
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 leading-tight">{pub.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              {pub.doi && (
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer" className="hover:text-brand-600 underline underline-offset-2">
                    {pub.doi}
                  </a>
                </span>
              )}
              {pub.journal && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                  {pub.journal}
                </span>
              )}
              {pub.publication_year && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {pub.publication_year}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {pub.open_access && <span className="badge badge-green">Open Access</span>}
            <span className="badge badge-gray">{pub.publication_type || 'Article'}</span>
            <button 
              onClick={handleDelete} 
              disabled={deleting}
              className="btn btn-danger text-xs px-3 ml-2"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              Authors ({authors.length})
            </h3>
            <div className="space-y-3">
              {authors.map((author, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                      {author.author_order}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{author.author_name}</div>
                      <div className="text-xs text-gray-500 capitalize">{author.author_type}</div>
                    </div>
                  </div>
                  {author.student_id && (
                    <Link to={`/students/${author.student_id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      View Profile &rarr;
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-500" />
              Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Citations</span>
                <span className="font-medium">{pub.citations || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Impact Factor</span>
                <span className="font-medium">{pub.impact_factor ? pub.impact_factor.toFixed(2) : '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-sm">Q Rank</span>
                <span className="font-medium">{pub.q_rank || '-'}</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">First Author</div>
                <div className="text-sm font-medium">{pub.first_author || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Corresponding Author</div>
                <div className="text-sm font-medium">{pub.corresponding_author || '-'}</div>
              </div>
              {pub.foreign_collab && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Foreign Collaboration</div>
                  <div className="text-sm font-medium">{pub.foreign_collab}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
