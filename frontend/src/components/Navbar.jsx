import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

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

          {/* Admin-only links */}
          {isAdmin && (
            <>
              <Link
                to="/students"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
              >
                Students
              </Link>
              <Link
                to="/admin/images"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
              >
                Admin Dashboard
              </Link>
            </>
          )}

          {/* Auth section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              <span className="text-sm text-gray-500">
                {user.full_name}
                {isAdmin && (
                  <span className="ml-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={logout}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-red-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
