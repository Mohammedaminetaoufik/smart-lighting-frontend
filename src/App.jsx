import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

const LoginPage = lazy(() => import('./pages/Login/LoginPage'))
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'))
const MapPage = lazy(() => import('./pages/Map/MapPage'))
const LCUsPage = lazy(() => import('./pages/LCUs/LCUsPage'))
const LampadairesPage = lazy(() => import('./pages/Lampadaires/LampadairesPage'))
const CommissioningPage = lazy(() => import('./pages/Commissioning/CommissioningPage'))
const AlertsPage = lazy(() => import('./pages/Alerts/AlertsPage'))
const ProfilesPage = lazy(() => import('./pages/Profiles/ProfilesPage'))
const WorkOrdersPage = lazy(() => import('./pages/WorkOrders/WorkOrdersPage'))
const EnergyPage = lazy(() => import('./pages/Energy/EnergyPage'))
const UsersPage = lazy(() => import('./pages/Users/UsersPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLog/AuditLogPage'))
const MaintenancePage = lazy(() => import('./pages/Maintenance/MaintenancePage'))
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistant/AIAssistantPage'))
const AICenterPage = lazy(() => import('./pages/AICenter/AICenterPage'))
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'))
const PredictiveMaintenancePage = lazy(() => import('./pages/PredictiveMaintenance/PredictiveMaintenancePage'))

function PageLoader() {
  return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">Chargement…</div>
}

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function RequireRole({ roles }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/ai-center" element={<AICenterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/predictive-maintenance" element={<PredictiveMaintenancePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
