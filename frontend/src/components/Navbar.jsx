import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container-narrow flex h-16 items-center justify-between">
        {/* Logo / Home link */}
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
          UG Research
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            Papers
          </Link>
          <Link
            to="/students"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            Students
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
