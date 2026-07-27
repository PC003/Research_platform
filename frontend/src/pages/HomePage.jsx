import { useState, useEffect, useCallback } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import PaperCard from '../components/PaperCard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { fetchPapers, searchPapers } from '../api/paperApi.js';

const INITIAL_FILTERS = {
  department: null,
  year_from: null,
  year_to: null,
};

function HomePage() {
  const [papers, setPapers] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [error, setError] = useState(null);

  // Load all papers on initial mount
  useEffect(() => {
    setIsLoading(true);
    fetchPapers()
      .then(setPapers)
      .catch(() => setError('Failed to load papers. Is the backend running?'))
      .finally(() => setIsLoading(false));
  }, []);

  // Handle search
  const handleSearch = useCallback(
    async (query) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await searchPapers(query, filters);
        setSearchResults(response);
      } catch {
        setError('Search failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Handle filter change
  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    // If we have active search results, re-run the search with new filters
    if (searchResults) {
      setIsLoading(true);
      searchPapers(searchResults.query, newFilters)
        .then(setSearchResults)
        .catch(() => setError('Search failed. Please try again.'))
        .finally(() => setIsLoading(false));
    }
  }

  // Determine what to display
  const displayPapers = searchResults
    ? searchResults.results.map((r) => ({ ...r.paper, _score: r.score }))
    : papers;

  return (
    <div className="container-narrow py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Undergraduate Research Discovery
        </h1>
        <p className="text-sm text-gray-500">
          Search across research papers using natural language queries
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Results info */}
      {searchResults && !isLoading && (
        <p className="mb-4 text-sm text-gray-500">
          Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for &ldquo;{searchResults.query}&rdquo;
        </p>
      )}

      {/* Content: filter sidebar + paper list */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden w-60 shrink-0 md:block">
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
            <div className="space-y-4">
              {displayPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  score={paper._score || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
