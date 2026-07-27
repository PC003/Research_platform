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
        <Link
          to="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
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
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {paper.department}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {paper.year}
          </span>
          {paper.journal && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {paper.journal}
            </span>
          )}
        </div>

        {/* Abstract */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Abstract
          </h2>
          <p className="leading-relaxed text-gray-700">
            {paper.abstract}
          </p>
        </section>

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
