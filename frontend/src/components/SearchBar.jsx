import { useState, useEffect, useRef, useCallback } from 'react';

function SearchBar({ onSearch, isLoading = false }) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  // Debounced search on keystroke
  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce 300ms
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        debounceRef.current = setTimeout(() => {
          onSearch(trimmed);
        }, 300);
      }
    },
    [onSearch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = query.trim();
    if (trimmed && onSearch) {
      onSearch(trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        {/* Search icon */}
        <svg
          className="absolute left-4 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>

        {/* Input */}
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search research papers by topic, title, or abstract..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-28 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        {/* Submit button */}
        <button
          id="search-button"
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
