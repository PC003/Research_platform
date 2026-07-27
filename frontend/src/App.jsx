import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import HomePage from './pages/HomePage.jsx';
import PaperDetailsPage from './pages/PaperDetailsPage.jsx';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/papers/:id" element={<PaperDetailsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
