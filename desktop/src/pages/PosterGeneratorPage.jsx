import { useState, useRef } from 'react';
import { Image, Download, Check, Users, ChevronLeft, ChevronRight, Star, Grid } from 'lucide-react';
import html2canvas from 'html2canvas';
import * as api from '../services/api';

export default function PosterGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('summary'); // 'summary' | 'spotlight'

  // Config (shared)
  const [month, setMonth] = useState(() => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[new Date().getMonth()];
  });
  const [year, setYear] = useState(String(new Date().getFullYear()));
  
  // Summary specific
  const [achievementType, setAchievementType] = useState('journal_publications');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Spotlight specific
  const [topPublications, setTopPublications] = useState([]);
  const [selectedPublicationId, setSelectedPublicationId] = useState(null);

  const [selectionMessage, setSelectionMessage] = useState('');

  // Generation state
  const [posterPages, setPosterPages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [savedPaths, setSavedPaths] = useState([]);
  const posterRef = useRef(null);

  const handleFind = async () => {
    setLoading(true);
    setSelectionMessage('');
    setPosterPages([]);
    
    try {
      if (mode === 'summary') {
        const ids = await api.getAutoSelectCandidates(month, year, achievementType);
        setSelectedIds(new Set(ids));
        setSelectionMessage(`Found ${ids.length} eligible student(s).`);
      } else {
        const pubs = await api.getTopPublications(month, year);
        setTopPublications(pubs);
        if (pubs.length > 0) {
          setSelectedPublicationId(pubs[0].publication.id);
          setSelectionMessage(`Found ${pubs.length} high-impact publication(s).`);
        } else {
          setSelectionMessage('No publications found for this timeframe.');
        }
      }
    } catch (err) {
      console.error(err);
      setSelectionMessage('Error finding data.');
    } finally {
      setLoading(false);
    }
  };

  async function handleGenerate() {
    if (mode === 'summary' && selectedIds.size === 0) return;
    if (mode === 'spotlight' && !selectedPublicationId) return;
    
    setGenerating(true);
    setPosterPages([]);
    setSavedPaths([]);
    setCurrentPage(0);

    try {
      if (mode === 'summary') {
        const pages = await api.preparePoster(
          Array.from(selectedIds),
          month,
          year,
          achievementType,
        );
        setPosterPages(pages);
      } else {
        const page = await api.prepareSpotlightPoster(selectedPublicationId);
        setPosterPages([page]);
      }
    } catch (err) {
      console.error('Poster generation failed:', err);
      alert(err?.error || 'Failed to generate poster');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveCurrentPage() {
    if (!posterRef.current || !posterPages[currentPage]) return;
    setSaving(true);
    try {
      const iframe = posterRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      const canvas = await html2canvas(iframeDoc.body, {
        width: 1080,
        height: 1350,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      let prefix = mode === 'summary' ? `Summary_${month}_${year}` : 'Poster';
      if (mode === 'spotlight' && topPublications.length > 0) {
        const pub = topPublications.find(p => p.publication.id === selectedPublicationId);
        if (pub) prefix = `Spotlight_${pub.publication.title.substring(0, 30)}`;
      }

      const path = await api.savePosterImage(
        posterPages[currentPage].student_ids,
        base64Data,
        currentPage + 1,
        prefix
      );

      setSavedPaths(prev => [...prev, path]);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save poster: ' + (err?.error || err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAllPages() {
    setSaving(true);
    try {
      for (let i = 0; i < posterPages.length; i++) {
        setCurrentPage(i);
        await new Promise(r => setTimeout(r, 500));

        const iframe = posterRef.current;
        if (!iframe) continue;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        const canvas = await html2canvas(iframeDoc.body, {
          width: 1080,
          height: 1350,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#020617',
        });

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];

        let prefix = mode === 'summary' ? `Summary_${month}_${year}` : 'Poster';
        if (mode === 'spotlight' && topPublications.length > 0) {
          const pub = topPublications.find(p => p.publication.id === selectedPublicationId);
          if (pub) prefix = `Spotlight_${pub.publication.title.substring(0, 30)}`;
        }

        const path = await api.savePosterImage(
          posterPages[i].student_ids,
          base64Data,
          i + 1,
          prefix
        );
        setSavedPaths(prev => [...prev, path]);
      }
    } catch (err) {
      console.error('Save all failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyCurrentPage() {
    if (!posterRef.current || !posterPages[currentPage]) return;
    try {
      const iframe = posterRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const canvas = await html2canvas(iframeDoc.body, {
        width: 1080, height: 1350, scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#020617',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Poster copied to clipboard!');
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fade-in max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-surface-900">Generate Poster</h1>
        <p className="text-sm text-gray-500 mt-1">Create stunning recognition posters for students</p>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-6">
        {/* Left: Configuration */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
          {/* Mode Selector */}
          <div className="card p-2 flex bg-surface-100">
            <button
              onClick={() => { setMode('summary'); setPosterPages([]); setSelectionMessage(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-colors ${mode === 'summary' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid className="w-4 h-4" /> Monthly Summary Grid
            </button>
            <button
              onClick={() => { setMode('spotlight'); setPosterPages([]); setSelectionMessage(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-colors ${mode === 'spotlight' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Star className="w-4 h-4" /> High-Impact Spotlight
            </button>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              {mode === 'summary' ? 'Grid Configuration' : 'Spotlight Configuration'}
            </h2>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="form-label">Month</label>
                <select value={month} onChange={e => setMonth(e.target.value)} className="form-input text-sm">
                  <option value="All">All Months (Ignore)</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="form-label">Year</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)} className="form-input text-sm" />
              </div>
            </div>

            {mode === 'summary' && (
              <div className="mb-4">
                <label className="form-label">Achievement Type</label>
                <select value={achievementType} onChange={e => setAchievementType(e.target.value)} className="form-input text-sm">
                  <option value="journal_publications">Journal Publication</option>
                  <option value="conference_presentations">Conference Presentation</option>
                  <option value="book_chapters">Book Chapter</option>
                  <option value="patents_filed">Patent Filing</option>
                  <option value="research_awards">Research Award</option>
                </select>
              </div>
            )}

            <button
              onClick={handleFind}
              disabled={loading}
              className="btn btn-secondary w-full justify-center mb-4"
            >
              {loading ? <div className="spinner" style={{width:16,height:16}} /> : 'Find Candidates'}
            </button>

            {selectionMessage && (
              <div className="text-sm text-brand-600 font-medium bg-brand-50 p-3 rounded-lg border border-brand-100 mb-4">
                {selectionMessage}
              </div>
            )}

            {mode === 'spotlight' && topPublications.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Select High-Impact Publication</label>
                <select 
                  value={selectedPublicationId || ''} 
                  onChange={e => setSelectedPublicationId(Number(e.target.value))} 
                  className="form-input text-sm"
                  size={5}
                >
                  {topPublications.map(p => (
                    <option key={p.publication.id} value={p.publication.id}>
                      [{p.publication.impact_factor || '-'}] {p.publication.title.substring(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || (mode === 'summary' && selectedIds.size === 0) || (mode === 'spotlight' && !selectedPublicationId)}
              className="btn btn-primary w-full justify-center text-sm font-semibold py-2.5"
            >
              {generating ? <><div className="spinner" style={{width:16,height:16}} /> Generating...</> : <><Image className="w-4 h-4" /> Generate Poster</>}
            </button>
          </div>
        </div>

        {/* Right: Poster Preview */}
        <div className="col-span-8 flex flex-col card p-0 overflow-hidden bg-gray-900 border-none shadow-xl rounded-xl">
          {posterPages.length > 0 ? (
            <>
              {/* Page navigation */}
              {posterPages.length > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-surface-200">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="btn btn-secondary text-xs py-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="text-xs font-semibold text-gray-600">
                    Page {currentPage + 1} of {posterPages.length}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(posterPages.length - 1, p + 1))}
                    disabled={currentPage >= posterPages.length - 1}
                    className="btn btn-secondary text-xs py-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Poster render area */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                <iframe
                  ref={posterRef}
                  srcDoc={posterPages[currentPage]?.html_content}
                  style={{ width: '1080px', height: '1350px', border: 'none', transform: 'scale(0.55)', transformOrigin: 'center center', margin: '-300px -240px' }}
                  title="Poster Preview"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-6 py-4 bg-surface-50 border-t border-surface-200">
                <div className="flex gap-2">
                  <button onClick={handleSaveCurrentPage} disabled={saving} className="btn btn-primary px-3 py-1.5 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1" /> Save
                  </button>
                  <button onClick={handleCopyCurrentPage} disabled={saving} className="btn btn-secondary px-3 py-1.5 text-xs">
                    Copy Image
                  </button>
                  {posterPages.length > 1 && (
                    <button onClick={handleSaveAllPages} disabled={saving} className="btn btn-secondary px-3 py-1.5 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Save All ({posterPages.length})
                    </button>
                  )}
                </div>
                {savedPaths.length > 0 && (
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                    <Check className="w-4 h-4" /> {savedPaths.length} saved
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Image className="w-16 h-16 text-gray-700 mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-300">Poster Preview</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm">
                Configure your options, find candidates, and click "Generate Poster" to preview the result here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
