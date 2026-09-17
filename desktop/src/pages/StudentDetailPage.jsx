import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Image, FolderOpen, Save, X, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import * as api from '../services/api';

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStudent();
  }, [id]);

  async function loadStudent() {
    setLoading(true);
    try {
      const s = await api.getStudent(id);
      setStudent(s);
      setEditForm({
        studentName: s.student_name,
        department: s.department || '',
        school: s.school || '',
        batch: s.batch || '',
      });
      // Load images
      if (s.photo_path) {
        try {
          const url = await api.getImageBase64(s.photo_path);
          setPhotoUrl(url);
        } catch { setPhotoUrl(null); }
      }
      if (s.poster_path) {
        try {
          const url = await api.getImageBase64(s.poster_path);
          setPosterUrl(url);
        } catch { setPosterUrl(null); }
      }
      // Load publications
      try {
        const pubs = await api.getStudentPublications(id);
        setPublications(pubs);
      } catch (err) {
        console.error('Failed to load publications:', err);
      }
    } catch (err) {
      setError('Student not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateStudent(id, editForm);
      setEditing(false);
      await loadStudent();
    } catch (err) {
      setError(err?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleReplacePhoto() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      });
      if (selected) {
        await api.updateStudentPhoto(id, selected);
        await loadStudent();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete student ${student.student_name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteStudent(id);
      navigate('/students');
    } catch (err) {
      setError(err?.error || 'Failed to delete');
      setDeleting(false);
    }
  }

  async function handleGeneratePoster() {
    navigate('/posters/generate', { state: { selectedStudents: [id] } });
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  }
  if (error && !student) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
        <button onClick={() => navigate('/students')} className="btn btn-secondary mt-4">Back to Students</button>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-3xl">
      <button onClick={() => navigate('/students')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-5 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      <div className="card">
        <div className="flex items-start gap-6">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-surface-100 border border-surface-200">
              {photoUrl ? (
                <img src={photoUrl} alt={student.student_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-surface-300">
                  {student.student_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <button onClick={handleReplacePhoto} className="btn btn-secondary text-xs mt-2 w-full py-1.5">
              {photoUrl ? 'Replace' : 'Add Photo'}
            </button>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                {editing ? (
                  <input
                    value={editForm.studentName}
                    onChange={e => setEditForm(f => ({ ...f, studentName: e.target.value }))}
                    className="form-input text-xl font-bold"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-surface-900">{student.student_name}</h2>
                )}
                <span className="font-mono text-sm font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded mt-1 inline-block">
                  {student.student_id}
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

            <div className="grid grid-cols-3 gap-4">
              {editing ? (
                <>
                  <div>
                    <label className="form-label">School</label>
                    <input value={editForm.school} onChange={e => setEditForm(f => ({ ...f, school: e.target.value }))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Batch</label>
                    <input value={editForm.batch} onChange={e => setEditForm(f => ({ ...f, batch: e.target.value }))} className="form-input" />
                  </div>
                </>
              ) : (
                <>
                  <InfoField label="School" value={student.school} />
                  <InfoField label="Batch" value={student.batch} />
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-surface-200 flex gap-3">
              <button onClick={handleGeneratePoster} className="btn btn-primary text-xs">
                <Image className="w-3.5 h-3.5" /> Generate Poster
              </button>
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
            No publications linked to this student.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {publications.map((p, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(`/publications/${p.publication_id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{p.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.journal || 'Unknown Journal'} • {p.publication_year || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <span className="badge badge-gray text-[10px] py-0">{p.publication_type || 'Article'}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      Author #{p.author_order} ({p.author_type})
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
