import { Link } from 'react-router-dom';

function PaperCard({ paper, score }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      {/* Title */}
      <h3 className="mb-1">
        <Link
          to={`/papers/${paper.id}`}
          className="text-base font-semibold text-blue-600 hover:underline"
        >
          {paper.title}
        </Link>
      </h3>

      {/* Authors and year */}
      <p className="mb-2 text-sm text-gray-500">
        {paper.authors.join(', ')}
        <span className="mx-1.5">·</span>
        {paper.year}
      </p>

      {/* Journal */}
      {paper.journal && (
        <p className="mb-2 text-xs italic text-gray-500">
          {paper.journal}
        </p>
      )}

      {/* Abstract preview (if available) */}
      {paper.abstract && (
        <p className="mb-3 text-sm leading-relaxed text-gray-700">
          {paper.abstract}
        </p>
      )}

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {paper.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Footer: score badge + department */}
      <div className="flex items-center gap-2">
        {score > 0 && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Relevance: {(score * 100).toFixed(1)}%
          </span>
        )}
        {paper.department && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
            {paper.department}
          </span>
        )}
      </div>
    </article>
  );
}

export default PaperCard;
