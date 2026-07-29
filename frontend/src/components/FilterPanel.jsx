import { useState, useEffect } from 'react';
import { fetchDepartments, fetchSchools, fetchPaperTypes } from '../api/paperApi.js';

function FilterPanel({ filters, onFilterChange }) {
  const [departments, setDepartments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [paperTypes, setPaperTypes] = useState([]);

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
    fetchSchools().then(setSchools).catch(() => setSchools([]));
    fetchPaperTypes().then(setPaperTypes).catch(() => setPaperTypes([]));
  }, []);

  function handleChange(field, value) {
    onFilterChange({ ...filters, [field]: value || null });
  }

  function handleClearFilters() {
    onFilterChange({
      department: null,
      school: null,
      year_from: null,
      year_to: null,
      paper_type: null,
      sort: 'relevance',
    });
  }

  const hasActiveFilters =
    filters.department || filters.school || filters.year_from ||
    filters.year_to || filters.paper_type;

  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="mb-4">
        <label htmlFor="filter-sort" className="mb-1.5 block text-xs font-medium text-gray-600">
          Sort by
        </label>
        <select
          id="filter-sort"
          value={filters.sort || 'relevance'}
          onChange={(e) => handleChange('sort', e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="citations_desc">Most cited</option>
          <option value="impact_desc">Highest impact</option>
          <option value="alphabetical">A → Z</option>
        </select>
      </div>

      {/* Department filter */}
      <div className="mb-4">
        <label htmlFor="filter-department" className="mb-1.5 block text-xs font-medium text-gray-600">
          Department
        </label>
        <select
          id="filter-department"
          value={filters.department || ''}
          onChange={(e) => handleChange('department', e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* School filter */}
      <div className="mb-4">
        <label htmlFor="filter-school" className="mb-1.5 block text-xs font-medium text-gray-600">
          School
        </label>
        <select
          id="filter-school"
          value={filters.school || ''}
          onChange={(e) => handleChange('school', e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Paper type filter */}
      <div className="mb-4">
        <label htmlFor="filter-paper-type" className="mb-1.5 block text-xs font-medium text-gray-600">
          Paper type
        </label>
        <select
          id="filter-paper-type"
          value={filters.paper_type || ''}
          onChange={(e) => handleChange('paper_type', e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {paperTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Year range filters */}
      <div className="mb-1">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">
          Publication year
        </label>
        <div className="flex items-center gap-2">
          <input
            id="filter-year-from"
            type="number"
            placeholder="From"
            value={filters.year_from || ''}
            onChange={(e) => handleChange('year_from', e.target.value ? parseInt(e.target.value, 10) : null)}
            min={2000}
            max={2030}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400">–</span>
          <input
            id="filter-year-to"
            type="number"
            placeholder="To"
            value={filters.year_to || ''}
            onChange={(e) => handleChange('year_to', e.target.value ? parseInt(e.target.value, 10) : null)}
            min={2000}
            max={2030}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </aside>
  );
}

export default FilterPanel;
