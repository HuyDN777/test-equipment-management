import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { DeviceManagement } from './pages/DeviceManagement';
import { BorrowRequests } from './pages/BorrowRequests';
import { PartnerManagement } from './pages/PartnerManagement';
import { UserManagement } from './pages/UserManagement';
import { MaintenanceManagement } from './pages/MaintenanceManagement';
import { CategoryManagement } from './pages/CategoryManagement';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="devices" element={<DeviceManagement />} />
            <Route path="borrow-requests" element={<BorrowRequests />} />
            <Route path="maintenance" element={<MaintenanceManagement />} />
            <Route path="partners" element={<PartnerManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
