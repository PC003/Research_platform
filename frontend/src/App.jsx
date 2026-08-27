import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import PaperDetailsPage from './pages/PaperDetailsPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import StudentDetailsPage from './pages/StudentDetailsPage.jsx';
import AdminImageGeneratorPage from './pages/AdminImageGeneratorPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/papers/:id" element={<PaperDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Admin-only routes */}
            <Route
              path="/students"
              element={
                <ProtectedRoute requiredRole="admin">
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <StudentDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/images"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminImageGeneratorPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
