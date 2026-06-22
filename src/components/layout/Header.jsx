import { Sun, Moon, Menu } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useLocation } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'
import NotificationCenter from './NotificationCenter'

const PAGE_TITLES = {
  '/':             'Tableau de bord',
  '/map':          'Carte interactive',
  '/lcus':         'Passerelles LCU',
  '/lampadaires':  'Lampadaires',
  '/commissioning':'Mise en service',
  '/alerts':       'Alertes',
  '/workorders':   'Bons de travail',
  '/profiles':     'Profils d\'éclairage',
  '/energy':       'Analyse énergétique',
  '/simulator':    'Simulateur IoT',
  '/admin':         'Infrastructure',
  '/controllers':   'Contrôleurs',
  '/users':         'Utilisateurs',
  '/audit-log':     'Journal d\'audit',
  '/system-health': 'État du système',
  '/maintenance':   'Fenêtres de maintenance',
  '/settings':      'Paramètres',
}

export default function Header({ onMenuClick, alertCount = 0 }) {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || 'Smart Lighting'

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[15px] font-semibold text-[var(--text)]">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />
        <NotificationCenter />
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
