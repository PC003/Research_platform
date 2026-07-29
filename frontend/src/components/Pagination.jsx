function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < pages;

  // Generate visible page numbers
  const getPageNumbers = () => {
    const nums = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);

    if (start > 1) {
      nums.push(1);
      if (start > 2) nums.push('...');
    }

    for (let i = start; i <= end; i++) {
      nums.push(i);
    }

    if (end < pages) {
      if (end < pages - 1) nums.push('...');
      nums.push(pages);
    }

    return nums;
  };

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <p className="text-sm text-gray-500">
        Page {page} of {pages} ({total} total)
      </p>

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((num, i) =>
          num === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                num === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {num}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Pagination;
