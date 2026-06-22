import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Send, X, Copy, Check, RotateCcw,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Clock, Database, Loader2, Search, Plus,
  History, WifiOff, Wifi, PanelRightClose, PanelRightOpen,
  MessageSquarePlus, StopCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { checkAIHealth, askAI, askAIStream, getAIHistory, getAISuggestions } from '../../api/ai'
import { QK } from '../../lib/queryClient'
import { cn } from '../../utils/helpers'
import AIResultChart from '../../components/ai/AIResultChart'
import AIExportActions from '../../components/ai/AIExportActions'

// ─── Suggestions ──────────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'Donne-moi la situation globale du réseau.',
  'Quelle zone est la plus critique ?',
  'Quelle LCU doit être vérifiée en priorité ?',
  'Quels lampadaires sont hors ligne ?',
  'Quelles zones ont le plus d\'alertes critiques ?',
  'Quels bons de travail sont ouverts depuis longtemps ?',
  'Quelle zone consomme le plus d\'énergie ?',
  'Quels lampadaires ne sont pas encore commissionnés ?',
]

// ─── Markdown renderer (for AI messages) ─────────────────────────────────────
const MD = {
  p({ children }) {
    return (
      <p className="text-[15px] text-[var(--text)] leading-[1.75] mb-3 last:mb-0 break-words overflow-wrap-anywhere">
        {children}
      </p>
    )
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
  h3({ children }) {
    return (
      <h3 className="text-[15px] font-semibold text-[var(--text)] mt-5 mb-2 flex items-center gap-2 break-words">
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
  // pre wraps fenced code blocks — handles the scroll container
  pre({ children }) {
    return (
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl my-3 overflow-x-auto max-w-full">
        <pre className="p-4 text-[13px] font-mono text-[var(--text)] whitespace-pre overflow-x-auto">
          {children}
        </pre>
      </div>
    )
  },
  // code: block (inside pre) vs inline — detected by newlines in content
  code({ children, className }) {
    const text = String(children ?? '')
    const isBlock = className?.includes('language-') || text.includes('\n')
    if (isBlock) {
      // Rendered inside the custom pre above — just the code element
      return (
        <code className="text-[13px] font-mono text-[var(--text)] whitespace-pre">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[13px] font-mono text-brand-400 break-words">
        {children}
      </code>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3 rounded-xl border border-[var(--border)] max-w-full">
        <table className="w-full text-sm">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">{children}</thead>
  },
  th({ children }) {
    return <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{children}</th>
  },
  td({ children }) {
    return <td className="px-4 py-2.5 text-[var(--text)] border-b border-[var(--border)] last:border-0 break-words">{children}</td>
  },
  hr() {
    return <hr className="border-[var(--border)] my-4" />
  },
}

// ─── Priority badge ───────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  low:      'bg-slate-500/10 text-slate-400  border-slate-500/20',
  medium:   'bg-amber-500/10 text-amber-400  border-amber-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10   text-red-400    border-red-500/20',
}
const PRIORITY_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' }

function PriorityBadge({ priority }) {
  if (!priority) return null
  const key = PRIORITY_STYLES[priority] ? priority : 'medium'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
      PRIORITY_STYLES[key],
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        key === 'low' ? 'bg-slate-400' : key === 'medium' ? 'bg-amber-400' : key === 'high' ? 'bg-orange-400' : 'bg-red-400',
      )} />
      {PRIORITY_LABELS[key]}
    </span>
  )
}

// ─── SQL block ────────────────────────────────────────────────────────────────
function SQLBlock({ sql }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Database size={12} className="text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">SQL généré</span>
        </div>
        <button onClick={handleCopy} className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors', copied ? 'bg-green-500/20 text-green-400' : 'hover:bg-[var(--border)] text-[var(--text-muted)]')}>
          {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-[var(--text)] overflow-x-auto leading-relaxed whitespace-pre-wrap">{sql}</pre>
    </div>
  )
}

// ─── Data table ───────────────────────────────────────────────────────────────
function DataTable({ columns, rows }) {
  if (!rows?.length) return null
  const fmt = (v) => (v === null || v === undefined ? '—' : String(v))
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Données brutes</span>
        <span className="text-xs text-[var(--text-muted)]">{rows.length} ligne{rows.length > 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-[var(--text)] whitespace-nowrap">{fmt(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Normalize LLM output so ReactMarkdown parses headings correctly ──────────
// The LLM sometimes outputs "text### Titre" without a preceding newline.
// Markdown requires headings to be on their own line.
function normalizeMarkdown(text) {
  if (!text) return text
  return text
    .replace(/\r\n/g, '\n')                          // normalize CRLF
    .replace(/([^\n])(#{1,6} )/g, '$1\n\n$2')        // ensure blank line before headings
    .replace(/\n{3,}/g, '\n\n')                       // collapse 3+ blank lines to 2
}

// ─── Animated markdown — fade-in reveal with proper Markdown rendering ────────
function AnimatedMarkdown({ text, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    // Two-frame delay: first frame resets opacity to 0, second triggers transition
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setVisible(true)
        onDone?.()
      })
    })
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <div className="w-full min-w-0 overflow-hidden" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
        {normalizeMarkdown(text)}
      </ReactMarkdown>
    </div>
  )
}

// ─── Thinking dots ────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-60"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
    </div>
  )
}

// ─── User message bubble ──────────────────────────────────────────────────────
function UserMessage({ content }) {
  return (
    <div className="flex justify-end px-4 sm:px-8 lg:px-16">
      <div className="max-w-[75%] bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tr-sm px-5 py-3">
        <p className="text-[15px] text-[var(--text)] leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

// ─── AI message ───────────────────────────────────────────────────────────────
function AIMessage({ msg }) {
  const { result, streamingText, isStreaming, isThinking, error } = msg
  const [detailsOpen, setDetailsOpen]   = useState(false)
  const [copied, setCopied]             = useState(false)
  const [textAnimDone, setTextAnimDone] = useState(false)
  const chartRef = useRef(null)

  const chatText  = streamingText || result?.chat_response || ''
  const hasDetails = result?.sql

  // Reset animation state when a new response arrives
  const prevText = useRef('')
  useEffect(() => {
    if (!isStreaming && chatText && chatText !== prevText.current) {
      prevText.current = chatText
      setTextAnimDone(false)
    }
  }, [isStreaming, chatText])

  const handleCopy = () => {
    navigator.clipboard.writeText(chatText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="flex gap-4 px-4 sm:px-8 lg:px-16 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/25 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={13} className={cn('text-brand-500', isStreaming && 'animate-pulse')} />
      </div>

      <div className="flex-1 min-w-0 pb-2 overflow-hidden">
        {/* Thinking */}
        {isThinking && <ThinkingDots />}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 text-[14px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="break-words min-w-0">{error}</span>
          </div>
        )}

        {/* Main text */}
        {chatText && (
          <>
            {isStreaming ? (
              /* Live streaming: plain text + blinking cursor */
              <div className="text-[15px] text-[var(--text)] leading-[1.75] whitespace-pre-wrap break-words overflow-hidden">
                {chatText}
                <span
                  className="inline-block w-0.5 h-[1em] bg-brand-400 ml-0.5 align-middle"
                  style={{ animation: 'blink 0.7s step-end infinite' }}
                  aria-hidden
                />
                <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
              </div>
            ) : (
              /* Fade-in with full Markdown rendering */
              <AnimatedMarkdown text={chatText} onDone={() => setTextAnimDone(true)} />
            )}
          </>
        )}

        {/* Meta row */}
        {result && !isThinking && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[12px] text-[var(--text-muted)]">
            <PriorityBadge priority={result.priority} />
            {result.confidence && (
              <span className="flex items-center gap-1">
                <Sparkles size={10} className="text-brand-500" />
                {Math.round(result.confidence * 100)}% confiance
              </span>
            )}
            {result.rows?.length > 0 && (
              <span className="flex items-center gap-1">
                <Database size={10} />
                {result.rows.length} résultat{result.rows.length > 1 ? 's' : ''}
              </span>
            )}
            {result.execution_time_ms && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {result.execution_time_ms}ms
              </span>
            )}

            <div className="flex items-center gap-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {!isStreaming && chatText && (
                <button onClick={handleCopy} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
                  {copied ? <><Check size={11} />Copié</> : <><Copy size={11} />Copier</>}
                </button>
              )}
              {hasDetails && (
                <button
                  onClick={() => setDetailsOpen(v => !v)}
                  className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                >
                  {detailsOpen ? <><ChevronUp size={11} />Masquer SQL</> : <><ChevronDown size={11} />Voir SQL & données</>}
                </button>
              )}
              {result && <AIExportActions result={result} chartRef={chartRef} />}
            </div>
          </div>
        )}

        {/* Collapsible details */}
        {result && detailsOpen && (
          <div className="mt-4 space-y-3">
            {result.rows?.length > 0 && (
              <div ref={chartRef}>
                <AIResultChart columns={result.columns} rows={result.rows} chart={result.chart} question={result.question} />
              </div>
            )}
            <SQLBlock sql={result.sql} />
            <DataTable columns={result.columns ?? []} rows={result.rows ?? []} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── History item ─────────────────────────────────────────────────────────────
function HistoryItem({ item, onSelect }) {
  const isSuccess = item.status === 'success'
  const time = item.created_at
    ? new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <button
      onClick={() => onSelect(item.question)}
      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors group"
    >
      <p className="text-[13px] text-[var(--text)] line-clamp-2 leading-snug">{item.question}</p>
      <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)]">
        <span className={cn('font-semibold', isSuccess ? 'text-green-500' : 'text-red-400')}>
          {isSuccess ? '✓' : '✗'}
        </span>
        {time && <span>{time}</span>}
        {isSuccess && <span>{item.row_count} ligne{item.row_count !== 1 ? 's' : ''}</span>}
      </div>
    </button>
  )
}

// ─── Welcome screen ───────────────────────────────────────────────────────────
function WelcomeScreen({ suggestions, onSelect, isAIOnline }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/20 flex items-center justify-center mb-5">
        <Sparkles size={28} className="text-brand-500" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Lamalif IA</h2>
      <p className="text-[15px] text-[var(--text-muted)] mb-8 max-w-sm">
        Interrogez votre réseau de télégestion en langage naturel.
      </p>

      {!isAIOnline && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-6">
          <WifiOff size={14} />
          Service IA indisponible — vérifiez que FastAPI est lancé
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {suggestions.slice(0, 8).map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            disabled={!isAIOnline}
            className={cn(
              'text-left text-[13px] px-4 py-3 rounded-xl border transition-all',
              'border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface)]',
              'hover:border-brand-500/40 hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
let msgIdCounter = 0
const genId = () => `msg_${++msgIdCounter}`

export default function AIAssistantPage() {
  const [messages, setMessages]           = useState([])
  const [question, setQuestion]           = useState('')
  const [historyOpen, setHistoryOpen]     = useState(() => localStorage.getItem('ai-history-open') !== 'false')
  const [historySearch, setHistorySearch] = useState('')
  const [sessionHistory, setSessionHistory] = useState([])
  const [isAnalyzing, setIsAnalyzing]     = useState(false)

  const abortRef          = useRef(null)
  const textareaRef       = useRef(null)
  const bottomRef         = useRef(null)
  const pendingQuestion   = useRef(null)   // NOSONAR — .current is accessed in handleLoadFromHistory and useEffect
  const qc                = useQueryClient()

  useEffect(() => { localStorage.setItem('ai-history-open', String(historyOpen)) }, [historyOpen])

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // AI health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: QK.aiHealth,
    queryFn: checkAIHealth,
    retry: 0,
    staleTime: 30_000,
  })
  const isAIOnline = health?.status === 'ok'

  // Suggestions
  const { data: suggestData } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: getAISuggestions,
    staleTime: 60_000,
    enabled: isAIOnline,
  })
  const suggestions = suggestData?.suggestions?.length > 0 ? suggestData.suggestions : QUICK_QUESTIONS

  // History
  const { data: historyData, refetch: refetchHistory, isLoading: historyLoading } = useQuery({
    queryKey: [QK.aiHistory, historySearch],
    queryFn: () => getAIHistory(30, historySearch),
    staleTime: 0,
  })
  const historyItems = historyData?.rows ?? []

  // Update a specific message by id
  const updateMsg = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const handleAnalyze = useCallback((q_override) => {
    const q = (q_override ?? question).trim()
    if (!q) return

    // Cancel previous stream
    abortRef.current?.abort()
    setQuestion('')
    setIsAnalyzing(true)

    const userId  = genId()
    const aiId    = genId()

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: q },
      { id: aiId,   role: 'assistant', isThinking: true, isStreaming: false, streamingText: '', result: null, error: null },
    ])

    const payload = {
      question: q,
      language: 'fr',
      max_rows: 100,
      conversation_history: sessionHistory.slice(-6),
    }

    let metaData = null
    let accText  = ''

    abortRef.current = askAIStream(payload, {
      onMeta: (meta) => {
        metaData = meta
        updateMsg(aiId, {
          isThinking: false,
          isStreaming: true,
          result: {
            question: q,
            sql: meta.sql,
            columns: meta.columns,
            rows: meta.rows,
            summary: meta.summary,
            analysis: meta.analysis,
            recommendation: meta.recommendation,
            priority: meta.priority,
            confidence: meta.confidence,
            chat_response: null,
            chart: meta.chart,
            execution_time_ms: meta.execution_time_ms,
          },
        })
      },
      onToken: (token) => {
        accText += token
        updateMsg(aiId, { streamingText: accText })
      },
      onDone: () => {
        if (metaData) {
          updateMsg(aiId, {
            isStreaming: false,
            streamingText: '',
            result: {
              ...metaData,
              question: q,
              chat_response: accText || null,
            },
          })
          setSessionHistory((prev) => [
            ...prev,
            { role: 'user', content: q },
            { role: 'assistant', content: accText || metaData.summary || '' },
          ])
        }
        setIsAnalyzing(false)
        refetchHistory()
        qc.invalidateQueries({ queryKey: QK.aiHistory })
      },
      onError: (errMsg) => {
        // Fallback: non-streaming
        askAI(payload)
          .then((data) => {
            updateMsg(aiId, {
              isThinking: false,
              isStreaming: false,
              streamingText: '',
              result: data,
            })
            setSessionHistory((prev) => [
              ...prev,
              { role: 'user', content: q },
              { role: 'assistant', content: data.chat_response || data.summary || '' },
            ])
          })
          .catch((err) => {
            let msg = err.message ?? errMsg
            if (msg?.includes('indisponible') || msg?.includes('ECONNREFUSED'))
              msg = 'Service IA indisponible. Vérifiez que les backends sont lancés.'
            updateMsg(aiId, { isThinking: false, isStreaming: false, streamingText: '', error: msg })
          })
          .finally(() => {
            setIsAnalyzing(false)
            refetchHistory()
            qc.invalidateQueries({ queryKey: QK.aiHistory })
          })
      },
    })
  }, [question, sessionHistory, updateMsg, refetchHistory, qc])

  const handleNewConversation = () => {
    abortRef.current?.abort()
    setMessages([])
    setSessionHistory([])
    setQuestion('')
    setIsAnalyzing(false)
    textareaRef.current?.focus()
  }

  // Fire the pending question once the conversation state is fully reset
  useEffect(() => {
    if (pendingQuestion.current && messages.length === 0 && !isAnalyzing) {
      const q = pendingQuestion.current
      pendingQuestion.current = null
      handleAnalyze(q)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isAnalyzing])

  // Load a history question: reset conversation then auto-send the question
  const handleLoadFromHistory = (q) => {
    abortRef.current?.abort()
    pendingQuestion.current = q
    setMessages([])
    setSessionHistory([])
    setQuestion('')
    setIsAnalyzing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isAnalyzing && question.trim()) handleAnalyze()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsAnalyzing(false)
    // Mark the last streaming message as done
    setMessages((prev) => prev.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false, isThinking: false } : m
    ))
  }

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h,64px)-1px)] overflow-hidden -m-6">
      {/* ── History sidebar ── */}
      {historyOpen && (
        <div className="w-72 shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] animate-in slide-in-from-left-2 duration-200">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text)]">Historique</span>
            </div>
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
            >
              <PanelRightClose size={15} />
            </button>
          </div>

          {/* New conversation button */}
          <div className="p-3 border-b border-[var(--border)]">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors border border-brand-500/20"
            >
              <Plus size={14} />
              Nouvelle conversation
              {sessionHistory.length > 0 && (
                <span className="ml-auto text-[10px] opacity-60">{sessionHistory.length / 2} échange{sessionHistory.length / 2 > 1 ? 's' : ''}</span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/50"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {historyLoading ? (
              <div className="py-8 text-center">
                <Loader2 size={18} className="mx-auto text-brand-500 animate-spin mb-2" />
                <p className="text-xs text-[var(--text-muted)]">Chargement...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  {historySearch ? 'Aucun résultat.' : 'Aucune question pour le moment.'}
                </p>
              </div>
            ) : (
              historyItems.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onSelect={handleLoadFromHistory}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-2.5">
            {!historyOpen && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors mr-1"
                title="Voir l'historique"
              >
                <PanelRightOpen size={16} />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
              <Sparkles size={14} className="text-brand-500" />
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">Assistant IA</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Health badge */}
            {healthLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Loader2 size={11} className="animate-spin" /> Vérification...
              </span>
            ) : isAIOnline ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                IA connectée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
                <WifiOff size={11} /> IA indisponible
              </span>
            )}

            {messages.length > 0 && (
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border)]"
              >
                <MessageSquarePlus size={13} />
                Nouveau
              </button>
            )}
          </div>
        </div>

        {/* Messages thread */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen
              suggestions={suggestions}
              onSelect={(q) => handleAnalyze(q)}
              isAIOnline={isAIOnline}
            />
          ) : (
            <div className="py-8 space-y-8 max-w-4xl mx-auto w-full">
              {messages.map((msg) =>
                msg.role === 'user'
                  ? <UserMessage key={msg.id} content={msg.content} />
                  : <AIMessage key={msg.id} msg={msg} />
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Bottom input ── */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className={cn(
              'flex items-end gap-3 rounded-2xl border px-4 py-3 transition-colors',
              'bg-[var(--surface-2)] border-[var(--border)]',
              'focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20',
            )}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question sur votre réseau…"
                rows={1}
                disabled={isAnalyzing}
                className={cn(
                  'flex-1 resize-none bg-transparent text-[15px] text-[var(--text)]',
                  'placeholder:text-[var(--text-muted)] focus:outline-none',
                  'disabled:opacity-50 leading-relaxed max-h-40',
                )}
                style={{ height: '24px' }}
              />
              {isAnalyzing ? (
                <button
                  onClick={handleStop}
                  className="shrink-0 w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                  title="Arrêter"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleAnalyze()}
                  disabled={!question.trim() || (!isAIOnline && !healthLoading)}
                  className={cn(
                    'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                    question.trim() && (isAIOnline || healthLoading)
                      ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                      : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed',
                  )}
                >
                  <Send size={16} />
                </button>
              )}
            </div>
            <p className="text-center text-[11px] text-[var(--text-muted)] mt-2">
              Entrée pour envoyer · Shift+Entrée pour sauter une ligne
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
