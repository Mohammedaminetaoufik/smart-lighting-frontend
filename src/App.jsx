import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import MapPage from './pages/Map/MapPage'
import LCUsPage from './pages/LCUs/LCUsPage'
import LampadairesPage from './pages/Lampadaires/LampadairesPage'
import CommissioningPage from './pages/Commissioning/CommissioningPage'
import AlertsPage from './pages/Alerts/AlertsPage'
import ProfilesPage from './pages/Profiles/ProfilesPage'
import WorkOrdersPage from './pages/WorkOrders/WorkOrdersPage'
import EnergyPage from './pages/Energy/EnergyPage'
import SimulatorPage from './pages/Simulator/SimulatorPage'
import AdminPage from './pages/Admin/AdminPage'
import CabinetDetailPage from './pages/Cabinets/CabinetDetailPage'
import BasestationDetailPage from './pages/Basestations/BasestationDetailPage'
import ControllersPage from './pages/Controllers/ControllersPage'
import UsersPage from './pages/Users/UsersPage'
import AuditLogPage from './pages/AuditLog/AuditLogPage'
import SystemHealthPage from './pages/SystemHealth/SystemHealthPage'
import MaintenancePage from './pages/Maintenance/MaintenancePage'
import SettingsPage from './pages/Settings/SettingsPage'
import AIAssistantPage from './pages/AIAssistant/AIAssistantPage'
import AICenterPage from './pages/AICenter/AICenterPage'
import ProfilePage from './pages/Profile/ProfilePage'
import PredictiveMaintenancePage from './pages/PredictiveMaintenance/PredictiveMaintenancePage'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/lcus" element={<LCUsPage />} />
          <Route path="/lampadaires" element={<LampadairesPage />} />
          <Route path="/commissioning" element={<CommissioningPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/workorders" element={<WorkOrdersPage />} />
          <Route path="/energy" element={<EnergyPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/cabinets/:id" element={<CabinetDetailPage />} />
          <Route path="/basestations/:id" element={<BasestationDetailPage />} />
          <Route path="/controllers" element={<ControllersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/system-health" element={<SystemHealthPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/ai-center" element={<AICenterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/predictive-maintenance" element={<PredictiveMaintenancePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
