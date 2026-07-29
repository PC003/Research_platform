import { useState, useEffect, useCallback } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import PaperCard from '../components/PaperCard.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { fetchPapers, searchPapers } from '../api/paperApi.js';

const INITIAL_FILTERS = {
  department: null,
  school: null,
  year_from: null,
  year_to: null,
  paper_type: null,
  sort: 'relevance',
};

function HomePage() {
  const [papers, setPapers] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');

  // Load all papers on initial mount and when filters/page change (browse mode)
  useEffect(() => {
    if (currentQuery) return; // Skip if in search mode
    setIsLoading(true);
    setError(null);
    fetchPapers({
      department: filters.department,
      school: filters.school,
      sort: filters.sort === 'relevance' ? 'newest' : filters.sort,
      page,
      limit: 20,
    })
      .then((data) => {
        setPapers(data.items || []);
        setTotalPages(data.pages || 0);
        setTotalCount(data.total || 0);
      })
      .catch(() => setError('Failed to load papers. Is the backend running?'))
      .finally(() => setIsLoading(false));
  }, [filters.department, filters.school, filters.sort, page, currentQuery]);

  // Handle search
  const handleSearch = useCallback(
    async (query) => {
      setCurrentQuery(query);
      setIsLoading(true);
      setError(null);
      setPage(1);
      try {
        const response = await searchPapers(query, {
          department: filters.department,
          school: filters.school,
          year_from: filters.year_from,
          year_to: filters.year_to,
          paper_type: filters.paper_type,
          sort: filters.sort,
          page: 1,
          limit: 20,
        });
        setSearchResults(response);
        setTotalCount(response.total || 0);
      } catch {
        setError('Search failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Re-run search when filters change during search mode
  useEffect(() => {
    if (!currentQuery) return;
    handleSearch(currentQuery);
  }, [filters.department, filters.school, filters.year_from, filters.year_to, filters.paper_type, filters.sort]);

  // Handle filter change
  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  // Handle page change
  function handlePageChange(newPage) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (currentQuery) {
      // Re-run search with new page
      setIsLoading(true);
      searchPapers(currentQuery, {
        ...filters,
        page: newPage,
        limit: 20,
      })
        .then(setSearchResults)
        .catch(() => setError('Search failed.'))
        .finally(() => setIsLoading(false));
    }
  }

  // Determine what to display
  const displayPapers = searchResults
    ? searchResults.results.map((r) => ({ ...r.paper, _score: r.score }))
    : papers;

  const displayPages = searchResults
    ? Math.ceil((searchResults.total || 0) / 20)
    : totalPages;

  return (
    <div className="container-narrow py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Undergraduate Research Discovery
        </h1>
        <p className="text-sm text-gray-500">
          Search across {totalCount.toLocaleString()} research papers using natural language queries
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Results info */}
      {searchResults && !isLoading && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for
            &ldquo;{searchResults.query}&rdquo;
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {searchResults.search_mode}
            </span>
          </p>
          <button
            onClick={() => {
              setSearchResults(null);
              setCurrentQuery('');
              setPage(1);
            }}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Content: filter sidebar + paper list */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden w-64 shrink-0 md:block">
          <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Paper list */}
        <div className="min-w-0 flex-1">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <LoadingSkeleton count={3} />
          ) : displayPapers.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="space-y-4">
                {displayPapers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    score={paper._score || 0}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-6">
                <Pagination
                  page={page}
                  pages={displayPages}
                  total={totalCount}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
