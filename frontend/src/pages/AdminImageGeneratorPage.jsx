import { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function AdminImageGeneratorPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  
  // Form State
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');
  
  // Student Form State
  const [achievementType, setAchievementType] = useState('journal_publication');
  const [studentIds, setStudentIds] = useState('');
  
  // Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate(e) {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setError(null);
    
    try {
      const endpoint = activeTab === 'analytics' 
        ? `${API_BASE_URL}/admin/images/analytics-summary`
        : `${API_BASE_URL}/admin/images/student-recognition`;
        
      const payload = {
        month,
        year: parseInt(year),
        format: 'png',
      };
      
      if (activeTab === 'student') {
        payload.achievementType = achievementType;
        // split by comma and trim
        payload.studentIds = studentIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.imageUrl) {
        // Construct full URL since the backend returned a relative path
        setGeneratedImageUrl(`http://localhost:8000${data.imageUrl}`);
      } else {
        throw new Error('Failed to parse response');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="container-narrow py-12">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Admin Dashboard: Image Generator</h1>
      
      <div className="mb-8 flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => { setActiveTab('analytics'); setGeneratedImageUrl(null); setError(null); }}
          className={`pb-4 text-sm font-medium ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Analytics Summary
        </button>
        <button 
          onClick={() => { setActiveTab('student'); setGeneratedImageUrl(null); setError(null); }}
          className={`pb-4 text-sm font-medium ${activeTab === 'student' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Student Recognition Poster
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* FORM COLUMN */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleGenerate} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Month</label>
                <select 
                  value={month} 
                  onChange={e => setMonth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Year</label>
                <input 
                  type="number" 
                  value={year} 
                  onChange={e => setYear(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {activeTab === 'student' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Achievement Type</label>
                  <select 
                    value={achievementType} 
                    onChange={e => setAchievementType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="journal_publications">Journal Publications</option>
                    <option value="conference_presentations">Conference Presentations</option>
                    <option value="patents_filed">Patents Filed</option>
                    <option value="research_awards">Research Awards</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Student IDs (comma separated)</label>
                  <input 
                    type="text" 
                    value={studentIds} 
                    onChange={e => setStudentIds(e.target.value)}
                    placeholder="e.g. 24BCE1234, 23BCE9999"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Ensure these students exist in the database.</p>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={isGenerating}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating Image...' : 'Generate Image'}
            </button>
            
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* PREVIEW COLUMN */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-inner">
          {generatedImageUrl ? (
            <div className="w-full text-center">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Preview</h3>
              <a href={generatedImageUrl} target="_blank" rel="noreferrer">
                <img 
                  src={generatedImageUrl} 
                  alt="Generated Poster" 
                  className="mx-auto max-h-[600px] rounded-lg border border-gray-300 shadow-md transition-transform hover:scale-105" 
                />
              </a>
              <div className="mt-6 flex justify-center gap-4">
                <a 
                  href={generatedImageUrl} 
                  download 
                  className="rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download PNG
                </a>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedImageUrl)}
                  className="rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Copy URL
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <svg className="mx-auto mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-sm">Generated image will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminImageGeneratorPage;
