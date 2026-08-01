import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStudentById, fetchStudentPapers } from '../api/studentApi.js';
import PaperCard from '../components/PaperCard.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';

function StudentDetailsPage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPapers, setIsLoadingPapers] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Load student details
    setIsLoading(true);
    fetchStudentById(id)
      .then((data) => {
        setStudent(data);
        setError(null);
      })
      .catch(() => setError('Failed to load student details.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const loadPapers = useCallback(async () => {
    setIsLoadingPapers(true);
    try {
      const data = await fetchStudentPapers(id, { page, limit: 10 });
      setPapers(data.items || []);
      setTotalPages(data.pages || 0);
      setTotalCount(data.total || 0);
    } catch {
      // Gracefully handle paper load error
    } finally {
      setIsLoadingPapers(false);
    }
  }, [id, page]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  if (isLoading) {
    return (
      <div className="container-narrow py-8">
        <LoadingSkeleton count={1} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="container-narrow py-8 text-center text-red-600">
        {error || 'Student not found.'}
      </div>
    );
  }

  return (
    <div className="container-narrow py-8">
      <div className="mb-6">
        <Link to="/students" className="text-sm font-medium text-blue-600 hover:underline">
          &larr; Back to Students
        </Link>
      </div>

      <div className="mb-10 flex flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:flex-row md:text-left">
        <img
          src={student.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.student_name)}&size=120&background=random`}
          alt={student.student_name}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-50"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{student.student_name}</h1>
          <p className="mt-1 text-lg font-medium text-blue-600">{student.student_id}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 md:justify-start">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-7M5 10l7 4 7-4" />
              </svg>
              {student.department}
            </span>
            {student.batch && (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5">
                Batch {student.batch}
              </span>
            )}
            {student.school && <span>• {student.school}</span>}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Published Papers ({totalCount})
        </h2>
      </div>

      {isLoadingPapers ? (
        <LoadingSkeleton count={3} />
      ) : papers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-gray-500">
          This student hasn't published any papers yet.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
          
          <div className="mt-8">
            <Pagination
              page={page}
              pages={totalPages}
              total={totalCount}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default StudentDetailsPage;
