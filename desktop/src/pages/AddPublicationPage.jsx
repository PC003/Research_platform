import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, AlertTriangle, Plus, Trash2, Users } from 'lucide-react';
import * as api from '../services/api';

export default function AddPublicationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', journal: '', doi: '', publication_year: new Date().getFullYear(),
    publication_type: 'Article', citations: 0, first_author: '', corresponding_author: '',
    is_student_first_author: false, foreign_collab: '', impact_factor: '', q_rank: '', open_access: false
  });
  
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (e.target.type === 'checkbox') value = e.target.checked;
    else if (e.target.type === 'number') value = value ? Number(value) : '';
    
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleAddStudent = () => {
    setStudents(prev => [...prev, { student_id: '', student_name: '', school: '', batch: '', author_order: prev.length + 1 }]);
  };

  const handleStudentChange = (index, field, value) => {
    setStudents(prev => {
      const newStudents = [...prev];
      newStudents[index][field] = value;
      return newStudents;
    });
  };

  const handleRemoveStudent = (index) => {
    setStudents(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, author_order: i + 1 })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Publication Title is required');
    if (!form.publication_year) return setError('Publication Year is required');

    // Validate students
    for (const s of students) {
      if (!s.student_id.trim() || !s.student_name.trim()) {
        return setError('All student authors must have at least an ID and Name.');
      }
    }

    setSaving(true);
    try {
      const pub = await api.createPublication({
        ...form,
        title: form.title.trim(),
        journal: form.journal.trim() || null,
        doi: form.doi.trim() || null,
        impact_factor: form.impact_factor ? Number(form.impact_factor) : null,
        students: students.length > 0 ? students : undefined,
      });
      navigate(`/publications/${pub.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save publication');
      setSaving(false);
    }
  };

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Add Record</h1>
        <p className="text-sm text-gray-500 mt-1">Manually enter a publication and link its student authors</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <BookOpen className="text-brand-500 w-5 h-5" />
          <h2 className="font-semibold text-gray-800">Publication Details</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title *</label>
              <textarea 
                rows="2"
                required
                value={form.title} 
                onChange={handleChange('title')}
                className="form-input w-full resize-none"
                placeholder="Enter full paper title"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal / Conference</label>
                <input 
                  type="text" 
                  value={form.journal} 
                  onChange={handleChange('journal')}
                  className="form-input w-full"
                  placeholder="e.g. IEEE Access"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
                <input 
                  type="text" 
                  value={form.doi} 
                  onChange={handleChange('doi')}
                  className="form-input w-full"
                  placeholder="10.xxxx/xxxxx"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input 
                  type="number" 
                  required
                  value={form.publication_year} 
                  onChange={handleChange('publication_year')}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                  value={form.publication_type} 
                  onChange={handleChange('publication_type')}
                  className="form-input w-full"
                >
                  <option value="Article">Article</option>
                  <option value="Conference Paper">Conference Paper</option>
                  <option value="Book Chapter">Book Chapter</option>
                  <option value="Review">Review</option>
                  <option value="Note">Note</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citations</label>
                <input 
                  type="number" 
                  min="0"
                  value={form.citations} 
                  onChange={handleChange('citations')}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact Factor</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={form.impact_factor} 
                  onChange={handleChange('impact_factor')}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Q Rank</label>
                <select 
                  value={form.q_rank} 
                  onChange={handleChange('q_rank')}
                  className="form-input w-full"
                >
                  <option value="">None</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={form.open_access}
                    onChange={handleChange('open_access')}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Open Access</span>
                </label>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-800">
                  <Users className="w-5 h-5 text-brand-500" />
                  <h3 className="font-semibold">Student Authors</h3>
                </div>
                <button type="button" onClick={handleAddStudent} className="btn btn-secondary text-xs py-1.5">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
                </button>
              </div>
              
              {students.length === 0 ? (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                  No student authors added. Click "Add Student" to link students to this publication.
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50 relative">
                      <div className="pt-2">
                        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                          {student.author_order}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Student ID *</label>
                          <input 
                            type="text" 
                            required
                            value={student.student_id} 
                            onChange={(e) => handleStudentChange(index, 'student_id', e.target.value)}
                            className="form-input w-full py-1.5 text-sm"
                            placeholder="e.g. 21BCE0000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                          <input 
                            type="text" 
                            required
                            value={student.student_name} 
                            onChange={(e) => handleStudentChange(index, 'student_name', e.target.value)}
                            className="form-input w-full py-1.5 text-sm"
                            placeholder="Full Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">School</label>
                          <input 
                            type="text" 
                            value={student.school} 
                            onChange={(e) => handleStudentChange(index, 'school', e.target.value)}
                            className="form-input w-full py-1.5 text-sm"
                            placeholder="e.g. SCOPE"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
                          <input 
                            type="text" 
                            value={student.batch} 
                            onChange={(e) => handleStudentChange(index, 'batch', e.target.value)}
                            className="form-input w-full py-1.5 text-sm"
                            placeholder="e.g. 2025"
                          />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveStudent(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-8">
              <button 
                type="button" 
                onClick={() => navigate('/publications')}
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
                    Save Record
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
