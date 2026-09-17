import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Check, AlertTriangle } from 'lucide-react';
import * as api from '../services/api';

export default function AddFacultyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', school: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Faculty Name is required');

    setSaving(true);
    try {
      await api.createFaculty({
        name: form.name.trim(),
        school: form.school.trim() || null,
      });
      navigate('/faculty');
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save faculty');
      setSaving(false);
    }
  };

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Add Faculty</h1>
        <p className="text-sm text-gray-500 mt-1">Manually enter a new faculty member</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <GraduationCap className="text-brand-500 w-5 h-5" />
          <h2 className="font-semibold text-gray-800">Faculty Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-800 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <div className="pt-0.5">{error}</div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                required
                value={form.name} 
                onChange={handleChange('name')}
                className="form-input w-full"
                placeholder="e.g. Dr. John Doe"
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                <input 
                  type="text" 
                  value={form.school} 
                  onChange={handleChange('school')}
                  className="form-input w-full"
                  placeholder="e.g. SCOPE"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => navigate('/faculty')}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Save Faculty
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
