import { useEffect, useRef, useState } from 'react'
import { Search, Lightbulb, Radio, Bell, ClipboardList, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { globalSearch } from '../../api/search'
import { cn } from '../../utils/helpers'

const TYPE_ICON = {
  lampadaire: Lightbulb,
  lcu:        Radio,
  alert:      Bell,
  workorder:  ClipboardList,
  user:       Users,
}

const TYPE_COLOR = {
  lampadaire: 'text-yellow-500',
  lcu:        'text-blue-500',
  alert:      'text-red-500',
  workorder:  'text-purple-500',
  user:       'text-emerald-500',
}

const TYPE_LABEL = {
  lampadaire: 'Lampadaire',
  lcu:        'LCU',
  alert:      'Alerte',
  workorder:  'Bon de travail',
  user:       'Utilisateur',
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Cmd/Ctrl+K toggles
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setHighlighted(0)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      globalSearch(query)
        .then((res) => {
          setResults(res?.results || [])
          setHighlighted(0)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const goto = (hit) => {
    navigate(hit.url)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlighted]) {
      e.preventDefault()
      goto(results[highlighted])
    }
  }

  return (
    <>
      {/* Trigger button (header) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
        title="Rechercher (Ctrl+K)"
      >
        <Search size={13} />
        <span className="text-[12px]">Rechercher…</span>
        <kbd className="hidden md:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)] rounded">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
        title="Rechercher"
      >
        <Search size={18} />
      </button>

      {/* Search modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search size={16} className="text-[var(--text-muted)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Rechercher lampadaires, alertes, utilisateurs…"
                className="flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-muted)]">ESC</kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <p className="px-4 py-6 text-center text-[12px] text-[var(--text-muted)]">Recherche…</p>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                  Aucun résultat pour <span className="font-mono">{query}</span>
                </p>
              )}
              {!loading && query.length < 2 && (
                <p className="px-4 py-6 text-center text-[12px] text-[var(--text-muted)]">
                  Tapez au moins 2 caractères
                </p>
              )}
              {results.map((hit, i) => {
                const Icon = TYPE_ICON[hit.type] || Search
                return (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    onClick={() => goto(hit)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2',
                      highlighted === i
                        ? 'bg-[var(--surface-2)] border-brand-500'
                        : 'border-transparent hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <Icon size={14} className={TYPE_COLOR[hit.type] || 'text-[var(--text-muted)]'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text)] truncate">{hit.title}</p>
                      {hit.subtitle && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{hit.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 uppercase tracking-wider">
                      {TYPE_LABEL[hit.type] || hit.type}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
              <span className="text-[10px] text-[var(--text-muted)]">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">↑↓ pour naviguer · ↵ pour ouvrir</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
