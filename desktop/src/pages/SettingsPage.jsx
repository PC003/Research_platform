import { useState, useEffect } from 'react';
import { FolderOpen, HardDrive, Database, Info, Trash2, AlertTriangle } from 'lucide-react';
import * as api from '../services/api';

export default function SettingsPage() {
  const [appInfo, setAppInfo] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAppInfo(), api.getStorageInfo()])
      .then(([app, storage]) => {
        setAppInfo(app);
        setStorageInfo(storage);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleOpenFolder() {
    try {
      await api.openDataFolder();
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Application configuration and data management</p>
      </div>

      {/* Storage */}
      <div className="card mb-5">
        <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4" /> Local Storage
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-surface-100">
            <div>
              <p className="text-sm font-medium text-surface-800">Data Directory</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{storageInfo?.data_dir}</p>
            </div>
            <button onClick={handleOpenFolder} className="btn btn-secondary text-xs py-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Open Folder
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-100">
            <p className="text-sm font-medium text-surface-800">Database Size</p>
            <span className="text-sm text-gray-500">{formatBytes(storageInfo?.database_size_bytes || 0)}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <p className="text-sm font-medium text-surface-800">Student Folders</p>
            <span className="text-sm text-gray-500">{storageInfo?.student_folders || 0}</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card mb-5">
        <h3 className="text-sm font-semibold text-surface-800 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4" /> About
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Application</p>
            <p className="text-sm font-medium text-surface-800">UG Research — Desktop</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Version</p>
            <span className="badge badge-info">{appInfo?.version || '0.1.0'}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Architecture</p>
            <p className="text-sm text-gray-500">Local-first · SQLite · Tauri v2</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Data Storage</p>
            <p className="text-sm text-gray-500">All data stored locally on this device</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card border-red-100">
        <h3 className="text-sm font-semibold text-red-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Data Management
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Destructive actions cannot be undone. Make sure to back up your data before proceeding.
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to delete ALL local data? This includes all students, photos, and generated posters. This cannot be undone.')) {
                if (confirm('FINAL WARNING: This will permanently delete everything. Are you absolutely sure?')) {
                  try {
                    await api.resetData();
                    alert('Data successfully reset. The application will now reload.');
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                    alert('Failed to reset data: ' + e);
                  }
                }
              }
            }}
            className="btn btn-danger text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}
