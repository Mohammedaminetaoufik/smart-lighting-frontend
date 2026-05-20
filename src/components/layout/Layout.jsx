import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import Header from './Header'
import { getAlertCounts } from '../../api/alerts'
import { QK } from '../../lib/queryClient'

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const toggle = () => setCollapsed((v) => {
    localStorage.setItem('sidebar-collapsed', String(!v))
    return !v
  })
  return [collapsed, toggle]
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()

  const { data: counts } = useQuery({
    queryKey: QK.alertCounts,
    queryFn: getAlertCounts,
    refetchInterval: 30_000,
  })

  const alertCount = counts?.total || 0

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-200"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <Header onMenuClick={() => setMobileOpen(true)} alertCount={alertCount} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
