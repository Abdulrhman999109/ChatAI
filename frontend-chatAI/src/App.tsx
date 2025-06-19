import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Conversations from './pages/Conversations';
import Login from './pages/Login';
import Chat from './pages/Chat';
import DashboardLayout from './components/DashboardLayout';
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <>
    <ThemeToggle />
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
    
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Conversations />} />
          <Route path="chat/:id" element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;
