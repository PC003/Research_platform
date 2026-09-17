import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Save, X, FileText, GraduationCap } from 'lucide-react';
import * as api from '../services/api';

export default function FacultyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFaculty();
  }, [id]);

  async function loadFaculty() {
    setLoading(true);
    try {
      const f = await api.getFaculty(id);
      setFaculty(f);
      setEditForm({
        name: f.name,
        school: f.school || '',
      });

      // Load publications
      try {
        const pubs = await api.getFacultyPublications(id);
        setPublications(pubs);
      } catch (err) {
        console.error('Failed to load publications:', err);
      }
    } catch (err) {
      setError('Faculty not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateFaculty(id, editForm);
      setEditing(false);
      await loadFaculty();
    } catch (err) {
      setError(err?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete faculty ${faculty.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteFaculty(id);
      navigate('/faculty');
    } catch (err) {
      setError(err?.error || 'Failed to delete');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  }
  if (error && !faculty) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
        <button onClick={() => navigate('/faculty')} className="btn btn-secondary mt-4">Back to Faculty</button>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-3xl">
      <button onClick={() => navigate('/faculty')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-5 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Faculty
      </button>

      <div className="card">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-100 border border-brand-200 flex items-center justify-center text-3xl font-bold text-brand-700">
              {faculty.name?.charAt(0) || '?'}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                {editing ? (
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input text-xl font-bold"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-surface-900">{faculty.name}</h2>
                )}
                <span className="font-mono text-sm font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded mt-1 inline-block">
                  Faculty ID: {faculty.id}
                </span>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary text-xs py-1.5">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => setEditing(false)} className="btn btn-secondary text-xs py-1.5">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn btn-secondary text-xs py-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="btn btn-danger text-xs py-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editing ? (
                <>
                  <div>
                    <label className="form-label">School</label>
                    <input value={editForm.school} onChange={e => setEditForm(f => ({ ...f, school: e.target.value }))} className="form-input" />
                  </div>
                </>
              ) : (
                <>
                  <InfoField label="School" value={faculty.school} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publications */}
      <div className="card mt-5 p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-500 w-5 h-5" />
            <h2 className="font-semibold text-gray-800">Publications ({publications.length})</h2>
          </div>
        </div>
        
        {publications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No publications linked to this faculty member.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {publications.map((p, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(`/publications/${p.publication.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{p.publication.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.publication.journal || 'Unknown Journal'} • {p.publication.publication_year || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <span className="badge badge-gray text-[10px] py-0">{p.publication.publication_type || 'Article'}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      Author #{p.author_order}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-surface-800">{value || '—'}</p>
    </div>
  );
}
