import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import * as api from '../services/api';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentId: '', studentName: '', school: '', batch: '',
  });
  const [photoPath, setPhotoPath] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handlePickPhoto = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      });
      if (selected) {
        setPhotoPath(selected);
        // Read file for preview using fetch with file:// protocol
        try {
          const { readFile } = await import('@tauri-apps/plugin-fs');
          const data = await readFile(selected);
          const ext = selected.split('.').pop().toLowerCase();
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : `image/${ext}`;
          const blob = new Blob([data], { type: mime });
          const url = URL.createObjectURL(blob);
          setPhotoPreview(url);
        } catch {
          setPhotoPreview(null);
        }
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.studentId.trim()) return setError('Student ID is required');
    if (!form.studentName.trim()) return setError('Student Name is required');

    setSaving(true);
    try {
      const student = await api.createStudent({
        studentId: form.studentId.trim(),
        studentName: form.studentName.trim(),
        school: form.school.trim() || undefined,
        batch: form.batch.trim() || undefined,
        photoPath: photoPath || undefined,
      });
      setSuccess(student);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fade-in max-w-lg mx-auto mt-12">
        <div className="card text-center py-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1">Student Added</h2>
          <p className="text-sm text-gray-500 mb-6">
            {success.student_name} ({success.student_id}) has been saved to the local database.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate(`/students/${success.student_id}`)} className="btn btn-primary">
              View Student
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setForm({ studentId: '', studentName: '', department: '', school: '', batch: '' });
                setPhotoPath(null);
                setPhotoPreview(null);
              }}
              className="btn btn-secondary"
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Add Student</h1>
        <p className="text-sm text-gray-500 mt-1">Manually add a student to the local database</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div>
            <label className="form-label">Student ID *</label>
            <input
              type="text"
              value={form.studentId}
              onChange={handleChange('studentId')}
              placeholder="e.g. 24BCE1234"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Student Name *</label>
            <input
              type="text"
              value={form.studentName}
              onChange={handleChange('studentName')}
              placeholder="Full name"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">School</label>
            <input
              type="text"
              value={form.school}
              onChange={handleChange('school')}
              placeholder="e.g. SCOPE"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Batch</label>
            <input
              type="text"
              value={form.batch}
              onChange={handleChange('batch')}
              placeholder="e.g. 2024"
              className="form-input"
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <label className="form-label">Student Photo</label>
          <div className="photo-dropzone" onClick={handlePickPhoto}>
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Preview" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotoPath(null); setPhotoPreview(null); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">Click to select a photo</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, BMP, GIF</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <><div className="spinner" style={{width:16,height:16}} /> Saving...</> : 'Save Student'}
          </button>
          <button type="button" onClick={() => navigate('/students')} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
