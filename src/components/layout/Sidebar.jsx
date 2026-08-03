import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, Radio, Lightbulb, Settings2,
  Bell, ClipboardList, Users,
  CheckSquare, Workflow, BarChart3, ShieldAlert, Activity, Clock,
  ChevronLeft, ChevronRight, Sparkles, UserCircle2, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import BrandLogo from '../brand/BrandLogo'
import MaadenAILogo from '../brand/MaadenAILogo'
import { cn } from '../../utils/helpers'

const AI_DASHBOARD_URL = import.meta.env.VITE_AI_DASHBOARD_URL || 'http://localhost:5174'

const NAV = [
  { label: 'Tableau de bord', icon: LayoutDashboard, to: '/' },
  { label: 'Carte', icon: Map, to: '/map' },
  { divider: true, group: 'Infrastructure' },
  { label: 'Passerelles LCU', icon: Radio, to: '/lcus' },
  { label: 'Lampadaires', icon: Lightbulb, to: '/lampadaires' },
  { label: 'Mise en service', icon: CheckSquare, to: '/commissioning' },
  { divider: true, group: 'Exploitation' },
  { label: 'Alertes', icon: Bell, to: '/alerts' },
  { label: 'Bons de travail', icon: ClipboardList, to: '/workorders' },
  { label: "Profils d'éclairage", icon: Workflow, to: '/profiles' },
  { label: 'Maintenance prédictive', icon: ShieldAlert, to: '/predictive-maintenance' },
  { label: 'Maintenance', icon: Clock, to: '/maintenance' },
  { divider: true, group: 'Analyse' },
  { label: 'Énergie', icon: BarChart3, to: '/energy' },
  { label: 'Centre de décision IA', icon: Activity, to: '/ai-center' },
  { label: 'Assistant IA', icon: Sparkles, to: '/ai-assistant' },
  { divider: true, group: 'Administration' },
  { label: 'Contrôle IA V1.5', icon: MaadenAILogo, to: AI_DASHBOARD_URL, roles: ['admin'], external: true },
  { label: 'Utilisateurs', icon: Users, to: '/users', roles: ['admin'] },
  { label: "Journal d'audit", icon: ShieldAlert, to: '/audit-log', roles: ['admin'] },
  { divider: true, group: 'Outils' },
  { label: 'Paramètres', icon: Settings2, to: '/settings', roles: ['admin'] },
  { divider: true, group: 'Compte' },
  { label: 'Mon profil', icon: UserCircle2, to: '/profile' },
]

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }) {
  const { user } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-full flex flex-col',
          'border-r transition-all duration-200',
          'bg-[var(--surface)] border-[var(--border)]',
          collapsed ? 'w-16' : 'w-[240px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className={cn(
          'h-14 flex items-center border-b border-[var(--border)] shrink-0',
          collapsed ? 'justify-center px-0' : 'px-3'
        )}>
          <BrandLogo compact={collapsed} size="small" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((item) => {
            if (item.divider) {
              if (collapsed) return <div key={`div-${item.group}`} className="my-2 border-t border-[var(--border)]" />
              return (
                <p key={`div-${item.group}`} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-3 pt-4 pb-1">
                  {item.group}
                </p>
              )
            }
            if (item.roles && !item.roles.includes(user?.role)) return null
            if (item.external) {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg mb-0.5 text-[13px] font-medium transition-colors',
                    'text-[var(--text-muted)] hover:bg-brand-500/10 hover:text-brand-500',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                  )}
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      <ExternalLink size={11} className="ml-auto opacity-60" />
                    </>
                  )}
                </a>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onMobileClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg mb-0.5 text-[13px] font-medium transition-colors',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                    isActive
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} className={cn('shrink-0', isActive ? 'text-brand-500' : '')} />
                    {!collapsed && item.label}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer: version + collapse toggle */}
        <div className={cn(
          'border-t border-[var(--border)] flex items-center',
          collapsed ? 'justify-center py-3 px-0' : 'justify-between px-4 py-3'
        )}>
          {!collapsed && (
            <p className="text-[10px] text-[var(--text-muted)]">v1.0.0 · Backend :8080</p>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>
    </>
  )
}
