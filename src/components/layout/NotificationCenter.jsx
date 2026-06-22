import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, AlertTriangle } from 'lucide-react'
import { getAlerts } from '../../api/alerts'
import { cn } from '../../utils/helpers'

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  major:    'bg-orange-500',
  warning:  'bg-amber-500',
  info:     'bg-blue-500',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem('lastSeenAlertAt') || '')
  const panelRef = useRef(null)

  const { data } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => getAlerts({ status: 'open' }),
    refetchInterval: 30_000,
  })

  const alerts = (Array.isArray(data) ? data : data?.alerts || []).slice(0, 10)
  const unread = alerts.filter((a) => new Date(a.created_at) > new Date(lastSeen || 0))

  // Fermeture clic-extérieur + Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAllRead = () => {
    const now = new Date().toISOString()
    localStorage.setItem('lastSeenAlertAt', now)
    setLastSeen(now)
  }

  const goToAlerts = () => {
    setOpen(false)
    navigate('/alerts')
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[420px] overflow-hidden flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[13px] font-semibold text-[var(--text)]">Notifications</p>
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] text-brand-500 hover:underline"
            >
              <CheckCheck size={12} /> Tout marquer lu
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {alerts.length === 0 && (
              <p className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
                Aucune alerte ouverte
              </p>
            )}
            {alerts.map((a) => {
              const isUnread = new Date(a.created_at) > new Date(lastSeen || 0)
              return (
                <button
                  key={a.id}
                  onClick={goToAlerts}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-[var(--surface-2)] transition-colors',
                    isUnread && 'bg-brand-500/5'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', SEVERITY_DOT[a.severity] || 'bg-slate-500')} />
                  <span className="min-w-0">
                    <span className="block text-[12px] text-[var(--text)] leading-snug line-clamp-2">{a.message}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">
                      {a.lampadaire_reference || a.reference || ''}{a.zone ? ` · ${a.zone}` : ''} · {timeAgo(a.created_at)}
                    </span>
                  </span>
                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 ml-auto shrink-0" />}
                </button>
              )
            })}
          </div>

          <button
            onClick={goToAlerts}
            className="px-4 py-2.5 border-t border-[var(--border)] text-[12px] font-medium text-brand-500 hover:bg-[var(--surface-2)] transition-colors flex items-center justify-center gap-1.5"
          >
            <AlertTriangle size={12} /> Voir toutes les alertes
          </button>
        </div>
      )}
    </div>
  )
}
