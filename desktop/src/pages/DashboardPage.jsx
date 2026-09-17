import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Image, FileSpreadsheet, ArrowRight, Clock, FileText, GraduationCap } from 'lucide-react';
import * as api from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Local workspace overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="stat-card">
          <div className="stat-icon bg-brand-50">
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <div className="stat-value text-surface-900">{stats?.total_students || 0}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-indigo-50">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="stat-value text-surface-900">{stats?.total_publications || 0}</div>
            <div className="stat-label">Publications</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50">
            <GraduationCap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="stat-value text-surface-900">{stats?.total_faculty || 0}</div>
            <div className="stat-label">Faculty Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50">
            <Image className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="stat-value text-surface-900">{stats?.total_posters || 0}</div>
            <div className="stat-label">Posters Generated</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* School Breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-surface-800 mb-4">Students by School</h3>
          {stats?.schools?.length > 0 ? (
            <div className="space-y-3">
              {stats.schools.map(s => (
                <div key={s.school} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate mr-3">{s.school}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full"
                        style={{ width: `${Math.min(100, (s.count / stats.total_students) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-8 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4">No students yet. Import or add students to see school breakdown.</p>
          )}
        </div>

        {/* Recent Students */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-800">Recent Students</h3>
            <Link to="/students" className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recent_students?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recent_students.map(s => (
                <Link
                  key={s.student_id}
                  to={`/students/${s.student_id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-700">
                      {s.student_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{s.student_name}</p>
                    <p className="text-[11px] text-gray-400">{s.student_id} · {s.school || 'No school'}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4">No students yet.</p>
          )}
        </div>

        {/* Recent Imports */}
        {stats?.recent_imports?.length > 0 && (
          <div className="card col-span-2">
            <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Imports
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Total</th>
                  <th>Imported</th>
                  <th>Skipped</th>
                  <th>Errors</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_imports.map(imp => (
                  <tr key={imp.id}>
                    <td className="font-medium">{imp.filename}</td>
                    <td>{imp.total_rows}</td>
                    <td><span className="badge badge-valid">{imp.imported_count}</span></td>
                    <td>{imp.skipped_count > 0 ? <span className="badge badge-warning">{imp.skipped_count}</span> : '—'}</td>
                    <td>{imp.error_count > 0 ? <span className="badge badge-error">{imp.error_count}</span> : '—'}</td>
                    <td className="text-gray-400 text-xs">{imp.imported_at?.slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {stats?.total_students === 0 && (
        <div className="mt-8 card bg-gradient-to-r from-brand-50 to-brand-100 border-brand-200">
          <h3 className="font-semibold text-brand-900 mb-2">Get Started</h3>
          <p className="text-sm text-brand-700 mb-4">Import your first batch of students or add them manually.</p>
          <div className="flex gap-3">
            <Link to="/import" className="btn btn-primary">
              <FileSpreadsheet className="w-4 h-4" /> Import Excel
            </Link>
            <Link to="/students/add" className="btn btn-secondary">
              <Users className="w-4 h-4" /> Add Student
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
