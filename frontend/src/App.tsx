import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { UrlDetailPage } from './pages/UrlDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/urls/:id" element={<UrlDetailPage />} />
    </Routes>
  );
}

export default App;
