import { useState, useEffect } from 'react';
import { fetchDepartments } from '../api/paperApi.js';

function FilterPanel({ filters, onFilterChange }) {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  function handleDepartmentChange(e) {
    onFilterChange({
      ...filters,
      department: e.target.value || null,
    });
  }

  function handleYearFromChange(e) {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    onFilterChange({
      ...filters,
      year_from: value,
    });
  }

  function handleYearToChange(e) {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    onFilterChange({
      ...filters,
      year_to: value,
    });
  }

  function handleClearFilters() {
    onFilterChange({
      department: null,
      year_from: null,
      year_to: null,
    });
  }

  const hasActiveFilters = filters.department || filters.year_from || filters.year_to;

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

      {/* Department filter */}
      <div className="mb-4">
        <label htmlFor="filter-department" className="mb-1.5 block text-xs font-medium text-gray-600">
          Department
        </label>
        <select
          id="filter-department"
          value={filters.department || ''}
          onChange={handleDepartmentChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
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
            onChange={handleYearFromChange}
            min={1900}
            max={2030}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400">–</span>
          <input
            id="filter-year-to"
            type="number"
            placeholder="To"
            value={filters.year_to || ''}
            onChange={handleYearToChange}
            min={1900}
            max={2030}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </aside>
  );
}

export default FilterPanel;
