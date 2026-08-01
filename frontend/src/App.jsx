import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import HomePage from './pages/HomePage.jsx';
import PaperDetailsPage from './pages/PaperDetailsPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import StudentDetailsPage from './pages/StudentDetailsPage.jsx';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/papers/:id" element={<PaperDetailsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
