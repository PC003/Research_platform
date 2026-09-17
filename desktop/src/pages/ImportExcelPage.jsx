import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Upload, AlertTriangle, Check, X, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import * as api from '../services/api';

const STEPS = ['Select File', 'Preview', 'Import', 'Result'];

export default function ImportExcelPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [filePath, setFilePath] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [options, setOptions] = useState({ skip_errors: true, import_warnings: true });

  // Step 1: Select file
  async function handleSelectFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      });
      if (selected) {
        setFilePath(selected);
        setError(null);
        setAnalyzing(true);
        try {
          const prev = await api.previewExcelImport(selected);
          setPreview(prev);
          setStep(1);
        } catch (err) {
          setError(err?.error || err?.message || 'Failed to analyze Excel file');
        } finally {
          setAnalyzing(false);
        }
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  }

  // Step 3: Execute import
  async function handleImport() {
    setImporting(true);
    setStep(2);
    setError(null);
    try {
      const res = await api.executeExcelImport(filePath, options);
      setResult(res);
      setStep(3);
    } catch (err) {
      setError(err?.error || err?.message || 'Import failed');
      setStep(1); // Go back to preview
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep(0);
    setFilePath(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Import Excel</h1>
        <p className="text-sm text-gray-500 mt-1">Import publications, authors, and students from an Excel workbook</p>
      </div>

      {/* Wizard Steps */}
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
            {i < step ? <Check className="w-3.5 h-3.5 inline mr-1" /> : null}
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Select File */}
      {step === 0 && (
        <div className="card text-center py-16">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-5 text-brand-300" />
          <h3 className="text-lg font-bold text-surface-800 mb-2">Select Publication Excel File</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Choose a .xlsx file containing publication data. The system will automatically detect columns, group rows by publication, and link students.
          </p>
          <button onClick={handleSelectFile} disabled={analyzing} className="btn btn-primary text-base px-8 py-3">
            {analyzing ? (
              <><div className="spinner" style={{width:18,height:18}} /> Analyzing...</>
            ) : (
              <><Upload className="w-5 h-5" /> Choose File</>
            )}
          </button>
        </div>
      )}

      {/* Step 1: Preview */}
      {step === 1 && preview && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <SummaryCard label="Total Rows" value={preview.total_rows} color="brand" />
            <SummaryCard label="Publications" value={preview.valid_count} color="emerald" />
            <SummaryCard label="Warnings" value={preview.warning_count} color="amber" />
            <SummaryCard label="Errors" value={preview.error_count} color="red" />
          </div>

          {/* Options */}
          <div className="card mb-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-3">Import Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.import_warnings}
                  onChange={e => setOptions(o => ({ ...o, import_warnings: e.target.checked }))}
                  className="rounded"
                />
                Import publications with warnings (e.g. malformed data that could be safely ignored)
              </label>
            </div>
          </div>

          {/* Preview table */}
          <div className="card p-0 overflow-hidden mb-5" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Journal</th>
                  <th>Authors</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.publications.map((pub, idx) => (
                  <tr key={idx}>
                    <td>
                      <StatusBadge status={pub.status} />
                    </td>
                    <td className="font-medium max-w-xs truncate" title={pub.title}>{pub.title || '—'}</td>
                    <td className="text-gray-500 truncate max-w-[150px]">{pub.journal || '—'}</td>
                    <td>
                      <div className="flex -space-x-2">
                        {pub.authors.slice(0, 3).map((a, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-brand-100 border border-white flex items-center justify-center text-[10px] font-bold text-brand-700" title={a.name}>
                            {a.name.charAt(0)}
                          </div>
                        ))}
                        {pub.authors.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                            +{pub.authors.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-xs">
                      {pub.errors.map((e, i) => (
                        <span key={i} className="text-red-500 block">{e}</span>
                      ))}
                      {pub.warnings.map((w, i) => (
                        <span key={i} className="text-amber-600 block">{w}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={handleImport} className="btn btn-primary">
              <Check className="w-4 h-4" /> Import {preview.valid_count + (options.import_warnings ? preview.warning_count : 0)} Publications
            </button>
            <button onClick={reset} className="btn btn-secondary">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Importing */}
      {step === 2 && (
        <div className="card text-center py-16">
          <div className="spinner mx-auto mb-5" style={{ width: 32, height: 32 }} />
          <h3 className="text-lg font-bold text-surface-800 mb-2">Importing Data...</h3>
          <p className="text-sm text-gray-500">Creating publications, linking authors, and establishing relationships. Please wait.</p>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div>
          <div className="card text-center py-10 mb-5">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-1">Import Complete</h2>
            <p className="text-sm text-gray-500 mb-6">Database has been updated successfully.</p>

            <div className="flex justify-center gap-6 mb-6">
              <ResultStat label="Pubs Created" value={result.publications_created} color="emerald" />
              <ResultStat label="Pubs Updated" value={result.publications_updated} color="blue" />
              <ResultStat label="Students Created" value={result.students_created} color="brand" />
              <ResultStat label="Students Linked" value={result.students_linked} color="indigo" />
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={() => navigate('/publications')} className="btn btn-primary">
                <FileText className="w-4 h-4" /> View Publications
              </button>
              <button onClick={reset} className="btn btn-secondary">
                Import Another
              </button>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Failed to import {result.error_count} publications
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 pl-5 list-disc">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`p-4 rounded-xl ${colors[color]} border border-white/50`}>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function ResultStat({ label, value, color }) {
  const colors = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    brand: 'text-brand-600',
    blue: 'text-blue-600',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="text-center px-4">
      <div className={`text-3xl font-bold mb-1 ${colors[color]}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'Valid') return <span className="badge badge-valid">Valid</span>;
  if (status === 'Warning') return <span className="badge badge-warning">Warning</span>;
  if (status === 'Error') return <span className="badge badge-error">Error</span>;
  return <span className="badge badge-gray">{status}</span>;
}
