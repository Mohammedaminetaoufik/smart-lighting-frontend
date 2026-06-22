import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Copy, Check } from 'lucide-react'
import { cn } from '../../utils/helpers'

// Custom markdown components — dark theme
const MD_COMPONENTS = {
  p({ children }) {
    return (
      <p className="text-sm text-[var(--text)] leading-relaxed mb-3 last:mb-0">
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
    return <ul className="my-2 space-y-1.5 pl-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-2 space-y-1.5 pl-4 list-decimal">{children}</ol>
  },
  li({ children }) {
    return (
      <li className="flex items-start gap-2 text-sm text-[var(--text)]">
        <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
        <span className="flex-1">{children}</span>
      </li>
    )
  },
  h3({ children }) {
    return (
      <h3 className="text-sm font-semibold text-[var(--text)] mt-4 mb-1.5 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-brand-500 inline-block shrink-0" />
        {children}
      </h3>
    )
  },
  h4({ children }) {
    return <h4 className="text-sm font-semibold text-[var(--text-muted)] mt-3 mb-1">{children}</h4>
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-amber-500/40 pl-3 my-2 text-[var(--text-muted)] italic bg-amber-500/5 rounded-r-lg py-1.5 pr-2">
        {children}
      </blockquote>
    )
  },
  code({ children, className }) {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <pre className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 my-2 overflow-x-auto">
          <code className="text-xs font-mono text-[var(--text)]">{children}</code>
        </pre>
      )
    }
    return (
      <code className="bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs font-mono text-brand-400">
        {children}
      </code>
    )
  },
  hr() {
    return <hr className="border-[var(--border)] my-3" />
  },
}

// Word-by-word animated reveal
function AnimatedMarkdown({ text, speed = 18 }) {
  const [visibleWords, setVisibleWords] = useState(0)
  const [done, setDone]                 = useState(false)
  const timerRef                        = useRef(null)
  const words                           = text.split(' ')

  useEffect(() => {
    setVisibleWords(0)
    setDone(false)
    clearInterval(timerRef.current)

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleWords(words.length)
      setDone(true)
      return
    }

    timerRef.current = setInterval(() => {
      setVisibleWords((v) => {
        if (v >= words.length) {
          clearInterval(timerRef.current)
          setDone(true)
          return v
        }
        return v + 1
      })
    }, speed)

    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // While animating: show plain text word by word, then switch to full markdown
  if (!done) {
    const partial = words.slice(0, visibleWords).join(' ')
    return (
      <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
        {partial}
        <span
          aria-hidden="true"
          className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle opacity-70"
          style={{ animation: 'blink 0.8s step-end infinite' }}
        />
      </p>
    )
  }

  // Animation done — render full markdown
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
}

// ── Live streaming view — render text as-is with a blinking cursor ─────────────
function StreamingMarkdown({ text }) {
  return (
    <div className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
      {text}
      <span
        aria-hidden="true"
        className="inline-block w-0.5 h-[1em] bg-brand-400 ml-0.5 align-middle"
        style={{ animation: 'blink 0.7s step-end infinite' }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChatResponseBlock({ text, question, streaming = false }) {
  const [copied, setCopied] = useState(false)

  if (!text) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-[var(--surface)] border border-brand-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-brand-500/5 border-b border-brand-500/15">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand-500/15 flex items-center justify-center">
            <Sparkles size={11} className={cn('text-brand-500', streaming && 'animate-pulse')} />
          </div>
          <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider">
            {streaming ? 'Génération en cours…' : 'Réponse IA'}
          </span>
        </div>
        {!streaming && (
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors',
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]',
            )}
          >
            {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier</>}
          </button>
        )}
      </div>

      {/* Chat bubble body */}
      <div className="flex items-start gap-3 px-4 py-4">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500/30 to-blue-500/30 border border-brand-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={12} className="text-brand-500" />
        </div>

        {/* Content — live cursor when streaming, animated markdown when done */}
        <div className="flex-1 min-w-0">
          {streaming
            ? <StreamingMarkdown text={text} />
            : <AnimatedMarkdown text={text} speed={18} />
          }
        </div>
      </div>
    </div>
  )
}
