import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Images, Image as ImageIcon, Download, Copy } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import * as api from '../services/api';

function PosterCard({ student }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (student.poster_path) {
      api.getImageBase64(student.poster_path)
        .then(setUrl)
        .catch(console.error);
    }
  }, [student.poster_path]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!url) return;
    try {
      const filePath = await save({
        defaultPath: `poster_${student.student_id}.png`,
        filters: [{ name: 'Image', extensions: ['png'] }]
      });
      if (filePath) {
        const base64Data = url.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await writeFile(filePath, bytes);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save file.');
    }
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!url) return;
    try {
      const base64Data = url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error(err);
      alert('Failed to copy.');
    }
  };

  // Parse title from path
  // E.g., posters/Summary_August_2026_163231_p1.png -> Summary: August 2026
  let displayTitle = student.student_name;
  let displaySubtitle = student.student_id;
  
  if (student.poster_path) {
    const filename = student.poster_path.split('/').pop();
    if (filename.startsWith('Summary_')) {
      const parts = filename.split('_'); // [Summary, August, 2026, 163231, p1.png]
      if (parts.length >= 3) {
        displayTitle = `Monthly Summary`;
        displaySubtitle = `${parts[1]} ${parts[2]}`;
      }
    } else if (filename.startsWith('Spotlight_')) {
      const parts = filename.split('_'); // [Spotlight, PaperName, 163231, p1.png]
      if (parts.length >= 2) {
        displayTitle = `High Impact Spotlight`;
        displaySubtitle = parts[1].replace(/%20/g, ' ');
      }
    }
  }

  return (
    <div className="card p-3 flex flex-col gap-3 group">
      <div className="relative rounded-lg overflow-hidden border border-surface-200 bg-surface-50 aspect-[4/5]">
        {url ? (
          <img src={url} alt={displayTitle} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="spinner" style={{width: 20, height: 20}} />
          </div>
        )}
        
        {url && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
            <button onClick={handleDownload} className="btn btn-primary w-32 justify-center text-xs">
              <Download className="w-3.5 h-3.5 mr-2" /> Download
            </button>
            <button onClick={handleCopy} className="btn btn-secondary w-32 justify-center text-xs">
              <Copy className="w-3.5 h-3.5 mr-2" /> Copy Image
            </button>
          </div>
        )}
      </div>
      <div className="text-center px-1">
        <h3 className="text-sm font-semibold text-surface-800 truncate" title={displayTitle}>{displayTitle}</h3>
        <p className="text-xs text-gray-500 truncate" title={displaySubtitle}>{displaySubtitle}</p>
      </div>
    </div>
  );
}

export default function GeneratedPostersPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentsWithPosters()
      .then(res => {
        const sorted = [...res].sort((a, b) => {
          return new Date(b.updated_at) - new Date(a.updated_at);
        });

        // Deduplicate by poster_path so multi-student posters only show up once
        const uniquePosters = new Map();
        for (const s of sorted) {
          if (s.poster_path && !uniquePosters.has(s.poster_path)) {
            uniquePosters.set(s.poster_path, s);
          }
        }
        
        setStudents(Array.from(uniquePosters.values()));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in max-w-7xl mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Generated Posters Gallery</h1>
          <p className="text-sm text-gray-500 mt-1">View and download all recently generated posters</p>
        </div>
        <Link to="/posters/generate" className="btn btn-primary">
          <ImageIcon className="w-4 h-4 mr-2" /> New Poster
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="empty-state card py-16">
          <Images />
          <h3>No posters generated yet</h3>
          <p>Go to the Poster Generator to create student recognition posters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {students.map(s => (
            <PosterCard key={s.student_id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}
