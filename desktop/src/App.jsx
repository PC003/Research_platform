import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, FileSpreadsheet,
  Image, Images, Settings, Database, FileText, GraduationCap, BookOpen
} from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import PublicationsPage from './pages/PublicationsPage';
import AddPublicationPage from './pages/AddPublicationPage';
import PublicationDetailPage from './pages/PublicationDetailPage';
import FacultyPage from './pages/FacultyPage';
import AddFacultyPage from './pages/AddFacultyPage';
import FacultyDetailPage from './pages/FacultyDetailPage';
import StudentsPage from './pages/StudentsPage';
import AddStudentPage from './pages/AddStudentPage';
import StudentDetailPage from './pages/StudentDetailPage';
import ImportExcelPage from './pages/ImportExcelPage';
import PosterGeneratorPage from './pages/PosterGeneratorPage';
import GeneratedPostersPage from './pages/GeneratedPostersPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const location = useLocation();

  return (
    <div className="desktop-shell">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">UG Research</h1>
              <p className="text-[10.5px] text-surface-300 font-medium">Local Workspace</p>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-white/5 my-1" />

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />

          <div className="nav-section">Research</div>
          <NavItem to="/publications" icon={FileText} label="Publications" />
          <NavItem to="/publications/add" icon={BookOpen} label="Add Record" />
          <NavItem to="/faculty" icon={GraduationCap} label="Faculty" />

          <div className="nav-section">Students</div>
          <NavItem to="/students" icon={Users} label="All Students" />
          <NavItem to="/import" icon={FileSpreadsheet} label="Import Excel" />

          <div className="nav-section">Posters</div>
          <NavItem to="/posters/generate" icon={Image} label="Generate Poster" />
          <NavItem to="/posters" icon={Images} label="Generated Posters" />

          <div className="nav-section">System</div>
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[10px] text-surface-300/60 font-medium leading-relaxed">
            All data is stored locally on this device.
          </p>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/publications" element={<PublicationsPage />} />
          <Route path="/publications/add" element={<AddPublicationPage />} />
          <Route path="/publications/:id" element={<PublicationDetailPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/faculty/add" element={<AddFacultyPage />} />
          <Route path="/faculty/:id" element={<FacultyDetailPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/add" element={<AddStudentPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path="/import" element={<ImportExcelPage />} />
          <Route path="/posters/generate" element={<PosterGeneratorPage />} />
          <Route path="/posters" element={<GeneratedPostersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  );
}

export default App;
