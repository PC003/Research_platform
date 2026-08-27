import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Route guard component.
 *
 * - If `requiredRole` is "admin", only admins can access.
 * - If `requiredRole` is "user", any authenticated user can access.
 * - If not authenticated, redirects to /login.
 * - If authenticated but wrong role, shows access denied.
 */
function ProtectedRoute({ children, requiredRole = 'user' }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // Still checking token validity — show nothing to avoid flash
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but requires admin and user is not admin
  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <div className="container-narrow py-16 text-center">
        <svg
          className="mx-auto mb-4 h-16 w-16 text-red-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-sm text-gray-500">
          You don't have permission to view this page. Admin access required.
        </p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
