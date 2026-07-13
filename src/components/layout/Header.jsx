import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Menu, LogOut, KeyRound, ChevronDown, Eye, EyeOff, UserCircle2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'
import NotificationCenter from './NotificationCenter'
import { changePasswordApi } from '../../api/auth'

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
  '/profile':       'Mon profil',
  '/predictive-maintenance': 'Maintenance prédictive',
}

const ROLE_LABELS = {
  admin:    'Administrateur',
  operator: 'Technicien',
}

function ChangePasswordModal({ onClose }) {
  const [current,    setCurrent]    = useState('')
  const [next,       setNext]       = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showCurr,   setShowCurr]   = useState(false)
  const [showNext,   setShowNext]   = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [busy,       setBusy]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 8) { setError('Le nouveau mot de passe doit faire au moins 8 caractères.'); return }
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setBusy(true)
    try {
      await changePasswordApi(current, next)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Changer le mot de passe</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] text-lg leading-none">×</button>
        </div>

        {success ? (
          <div className="px-5 py-6 text-center space-y-3">
            <p className="text-sm text-green-500">Mot de passe modifié avec succès.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
            {[
              { label: 'Mot de passe actuel', value: current, onChange: setCurrent, show: showCurr, toggle: () => setShowCurr(v => !v) },
              { label: 'Nouveau mot de passe', value: next,    onChange: setNext,    show: showNext, toggle: () => setShowNext(v => !v) },
              { label: 'Confirmer le nouveau', value: confirm, onChange: setConfirm, show: showNext, toggle: null },
            ].map(({ label, value, onChange, show, toggle }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full px-3 py-2.5 pr-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                  {toggle && (
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Header({ onMenuClick, alertCount = 0 }) {
  const { theme, toggle } = useTheme()
  const { user, logout }  = useAuth()
  const { pathname }      = useLocation()
  const navigate          = useNavigate()
  const title             = PAGE_TITLES[pathname] || 'Smart Lighting'

  const [menuOpen,   setMenuOpen]   = useState(false)
  const [changePwd,  setChangePwd]  = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
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

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-semibold select-none">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium text-[var(--text)] max-w-[120px] truncate">{user?.name ?? '—'}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{ROLE_LABELS[user?.role] ?? user?.role}</span>
              </div>
              <ChevronDown size={14} className="text-[var(--text-muted)]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-20">
                {/* User mini-card */}
                <div className="px-3.5 py-3 border-b border-[var(--border)]">
                  <p className="text-[12px] font-semibold text-[var(--text)] truncate">{user?.name ?? '—'}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email ?? '—'}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <UserCircle2 size={14} className="text-[var(--text-muted)]" />
                  Mon profil
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setChangePwd(true) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <KeyRound size={14} className="text-[var(--text-muted)]" />
                  Changer le mot de passe
                </button>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={() => { logout(); navigate('/login', { replace: true }) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {changePwd && <ChangePasswordModal onClose={() => setChangePwd(false)} />}
    </>
  )
}
