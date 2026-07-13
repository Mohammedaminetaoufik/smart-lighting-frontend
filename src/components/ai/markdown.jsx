// Shared Markdown rendering for AI answers.
// - normalizeMarkdown : repairs LLM output so react-markdown/remark-gfm parses it
//   (headings, lists, and — crucially — TABLES that the model emits glued onto a
//   single line without newlines).
// - AI_MD_COMPONENTS : themed renderers, including styled tables + colored badges.
import { cn } from '../../utils/helpers'

/* ── Table reconstruction ─────────────────────────────────────
 * The LLM often emits a whole table on ONE line, with "||" marking row
 * boundaries (end-of-row pipe + start-of-next-row pipe) and the header glued
 * to the preceding prose. remark-gfm then fails to parse it. We repair it
 * line-by-line (reliable, no misfiring on the "---" separator or cell values).
 */
function reconstructTables(t) {
  if (!/\|\s*:?-{2,}/.test(t)) return t
  // 1. Split glued rows: "…row | | row…" → newline between the two pipes.
  const withRows = t.replace(/\|\|/g, '|\n|')
  // 2. Break prose glued to a header (the line just before a "|---|" separator).
  const lines = withRows.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1] || ''
    const nextIsSeparator = next.includes('|') && /^\s*\|?\s*:?-{2,}/.test(next)
    const startsWithPipe = /^\s*\|/.test(line)
    const hasProseThenPipe = /^[^|]*\S[^|]*\|/.test(line)
    if (nextIsSeparator && !startsWithPipe && hasProseThenPipe) {
      const idx = line.indexOf('|')
      const prose = line.slice(0, idx).trim()
      const header = line.slice(idx).trim()
      if (prose) { out.push(prose, '', header); continue }
    }
    out.push(line)
  }
  return out.join('\n')
}

/* ── Normalizer ───────────────────────────────────────────── */
export function normalizeMarkdown(text) {
  if (!text) return text
  let t = String(text).replace(/\r\n/g, '\n')

  // Headings must start their own line: "texte### Titre" → "texte\n\n### Titre"
  t = t.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')

  // Rebuild glued tables
  t = reconstructTables(t)

  // Split glued list items: "- A. - B" / "1. A. 2. B"
  t = t.replace(/([-*+]\s.+?)\.\s([-*+]\s)/g, '$1\n$2')
  t = t.replace(/(\d+\.\s.+?)\.\s(\d+\.\s)/g, '$1\n$2')

  return t.replace(/\n{3,}/g, '\n\n').trim()
}

/* ── Colored cell badges : turn status/priority/fault tokens into pills ── */
const CELL_BADGES = {
  // Statut bon de travail
  created: { c: '#64748b', l: 'Créé' }, open: { c: '#3b82f6', l: 'Ouvert' },
  accepted: { c: '#3b82f6', l: 'Accepté' }, in_progress: { c: '#f59e0b', l: 'En cours' },
  resolved: { c: '#22c55e', l: 'Résolu' }, closed: { c: '#10b981', l: 'Fermé' },
  cancelled: { c: '#ef4444', l: 'Annulé' },
  // Priorité
  critical: { c: '#ef4444' }, critique: { c: '#ef4444' }, urgent: { c: '#ef4444' },
  high: { c: '#f59e0b' }, haute: { c: '#f59e0b' }, 'élevé': { c: '#f59e0b' }, eleve: { c: '#f59e0b' },
  medium: { c: '#3b82f6' }, moyen: { c: '#3b82f6' }, moyenne: { c: '#3b82f6' },
  low: { c: '#64748b' }, faible: { c: '#64748b' }, basse: { c: '#64748b' },
  // État lampadaire
  online: { c: '#22c55e', l: 'En ligne' }, offline: { c: '#ef4444', l: 'Hors ligne' },
  maintenance: { c: '#f59e0b' },
  // Sévérité
  warning: { c: '#f59e0b' }, avertissement: { c: '#f59e0b' }, major: { c: '#f97316' }, info: { c: '#3b82f6' },
  // Pannes (codes + libellés)
  overcurrent: { c: '#ef4444', l: 'Surintensité' }, overvoltage: { c: '#f59e0b', l: 'Surtension' },
  underpower: { c: '#eab308', l: 'Sous-conso.' }, leakage: { c: '#8b5cf6', l: 'Fuite' },
}

function cellText(children) {
  if (children == null) return ''
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(cellText).join('')
  if (typeof children === 'object' && children.props) return cellText(children.props.children)
  return ''
}

/* ── Themed components ────────────────────────────────────── */
export const AI_MD_COMPONENTS = {
  p({ children }) {
    return <p className="text-[15px] text-[var(--text)] leading-[1.75] mb-3 last:mb-0 break-words">{children}</p>
  },
  strong({ children }) {
    return <strong className="font-semibold text-[var(--text)]">{children}</strong>
  },
  em({ children }) {
    return <em className="italic text-[var(--text-muted)]">{children}</em>
  },
  ul({ children }) {
    return <ul className="my-2.5 space-y-1.5 pl-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-2.5 space-y-1.5 pl-5 list-decimal">{children}</ol>
  },
  li({ children }) {
    return (
      <li className="flex items-start gap-2.5 text-[15px] text-[var(--text)] break-words min-w-0">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
        <span className="flex-1 min-w-0 break-words">{children}</span>
      </li>
    )
  },
  h1({ children }) { return <h3 className="text-[16px] font-bold text-[var(--text)] mt-5 mb-2">{children}</h3> },
  h2({ children }) {
    return (
      <h3 className="text-[15px] font-semibold text-[var(--text)] mt-5 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-brand-500 inline-block shrink-0" />
        <span className="break-words min-w-0">{children}</span>
      </h3>
    )
  },
  h3({ children }) {
    return (
      <h3 className="text-[15px] font-semibold text-[var(--text)] mt-5 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-brand-500 inline-block shrink-0" />
        <span className="break-words min-w-0">{children}</span>
      </h3>
    )
  },
  h4({ children }) {
    return <h4 className="text-[14px] font-semibold text-[var(--text-muted)] mt-4 mb-1.5 break-words">{children}</h4>
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-brand-500/40 pl-4 my-3 text-[var(--text-muted)] italic bg-brand-500/5 rounded-r-lg py-2 pr-3 break-words">
        {children}
      </blockquote>
    )
  },
  pre({ children }) {
    return (
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl my-3 overflow-x-auto max-w-full">
        <pre className="p-4 text-[13px] font-mono text-[var(--text)] whitespace-pre overflow-x-auto">{children}</pre>
      </div>
    )
  },
  code({ children, className }) {
    const raw = String(children ?? '')
    const isBlock = className?.includes('language-') || raw.includes('\n')
    if (isBlock) {
      return <code className="text-[13px] font-mono text-[var(--text)] whitespace-pre">{children}</code>
    }
    return (
      <code className="bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[13px] font-mono text-brand-400 break-words">
        {children}
      </code>
    )
  },
  /* ── Tables : the visual centrepiece of data answers ── */
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4 rounded-xl border border-[var(--border)] max-w-full shadow-sm">
        <table className="w-full text-[13px] border-collapse">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-[var(--surface-2)]">{children}</thead>
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
  },
  tr({ children }) {
    const txt = cellText(children).toLowerCase()
    const critical = /\bcritique\b|\bcritical\b|hors ligne|\boffline\b/.test(txt)
    return (
      <tr className={cn('transition-colors hover:bg-[var(--surface-2)]/60', critical && 'bg-red-500/[0.045]')}>
        {children}
      </tr>
    )
  },
  th({ children }) {
    return (
      <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] whitespace-nowrap">
        {children}
      </th>
    )
  },
  td({ children }) {
    const raw = cellText(children).trim()
    const key = raw.toLowerCase().replace(/\s+/g, '_').replace(/[.…·]/g, '')
    const badge = CELL_BADGES[key] || CELL_BADGES[raw.toLowerCase()]
    if (badge) {
      return (
        <td className="px-3.5 py-2.5 align-top">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
            style={{ color: badge.c, background: `${badge.c}1a` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.c }} />
            {badge.l || raw}
          </span>
        </td>
      )
    }
    const isNumeric = /^[-+]?\d[\d\s.,]*%?$/.test(raw) && raw.length <= 12
    return (
      <td className={cn('px-3.5 py-2.5 text-[var(--text)] align-top break-words',
        isNumeric && 'text-right tabular-nums font-medium')}>
        {children}
      </td>
    )
  },
  a({ children, href }) {
    return <a href={href} className="text-brand-500 hover:underline" target="_blank" rel="noreferrer">{children}</a>
  },
  hr() {
    return <hr className="border-[var(--border)] my-4" />
  },
}
