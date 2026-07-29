import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPaperById } from '../api/paperApi.js';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';

function PaperDetailsPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchPaperById(id)
      .then(setPaper)
      .catch(() => setError('Paper not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="container-narrow py-8">
        <LoadingSkeleton count={1} />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="container-narrow py-16 text-center">
        <p className="mb-4 text-lg font-medium text-gray-600">
          {error || 'Paper not found'}
        </p>
        <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="container-narrow py-8">
      {/* Back link */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
      >
        ← Back to search
      </Link>

      {/* Paper details */}
      <article>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          {paper.title}
        </h1>

        {/* Authors */}
        <p className="mb-4 text-sm text-gray-600">
          {paper.authors.join(', ')}
        </p>

        {/* Metadata badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          {paper.department && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {paper.department}
            </span>
          )}
          {paper.year > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {paper.year}
            </span>
          )}
          {paper.paper_type && (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
              {paper.paper_type}
            </span>
          )}
          {paper.status && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              {paper.status}
            </span>
          )}
          {paper.collaboration_type && (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
              {paper.collaboration_type}
            </span>
          )}
        </div>

        {/* Metrics row */}
        <div className="mb-6 flex flex-wrap gap-6 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3">
          {paper.citation_count > 0 && (
            <div>
              <p className="text-xs text-gray-500">Citations</p>
              <p className="text-lg font-semibold text-gray-900">{paper.citation_count}</p>
            </div>
          )}
          {paper.impact_factor && (
            <div>
              <p className="text-xs text-gray-500">Impact Factor</p>
              <p className="text-lg font-semibold text-gray-900">{paper.impact_factor}</p>
            </div>
          )}
          {paper.journal && (
            <div>
              <p className="text-xs text-gray-500">Journal</p>
              <p className="text-sm font-medium text-gray-900">{paper.journal}</p>
            </div>
          )}
          {paper.conference_name && (
            <div>
              <p className="text-xs text-gray-500">Conference</p>
              <p className="text-sm font-medium text-gray-900">{paper.conference_name}</p>
            </div>
          )}
        </div>

        {/* Student link */}
        {paper.student_id && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-1">Student</p>
            <Link
              to={`/students/${paper.student_id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {paper.student_id}
            </Link>
          </div>
        )}

        {/* Abstract */}
        {paper.abstract && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Abstract
            </h2>
            <p className="leading-relaxed text-gray-700">
              {paper.abstract}
            </p>
          </section>
        )}

        {/* Keywords */}
        {paper.keywords && paper.keywords.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Keywords
            </h2>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                >
                  {kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* DOI */}
        {paper.doi && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              DOI
            </h2>
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {paper.doi}
            </a>
          </section>
        )}

        {/* PDF link */}
        {paper.pdf_url && (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            View PDF
          </a>
        )}
      </article>
    </div>
  );
}

export default PaperDetailsPage;
