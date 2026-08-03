import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Database, Globe2, Sparkles, X } from 'lucide-react'
import MaadenAILogo from '../brand/MaadenAILogo'

const CAPABILITIES = [
  { icon: Database, label: 'Données terrain' },
  { icon: BookOpenCheck, label: 'Procédures métier' },
  { icon: Globe2, label: 'Sources web vérifiées' },
]

export default function MaadenAIWelcomeModal({ open, onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const openAssistant = () => {
    onClose()
    navigate('/ai-assistant')
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="maaden-ai-welcome-title"
        className="relative w-full max-w-[920px] min-h-[560px] sm:min-h-[530px] overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[#041522] shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_60px_rgba(0,190,255,0.1)]"
        style={{ animation: 'maadenWelcomeIn 420ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`
          @keyframes maadenWelcomeIn {
            from { opacity: 0; transform: translateY(22px) scale(.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes maadenWelcomeGlow {
            0%, 100% { opacity: .5; transform: scale(1); }
            50% { opacity: .85; transform: scale(1.08); }
          }
        `}</style>

        <img
          src="/images/maaden-ai-welcome-v1.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[66%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03131f] via-[#03131f]/95 sm:via-[#03131f]/82 to-[#03131f]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#03131f]/95 via-transparent to-[#03131f]/25" />
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" style={{ animation: 'maadenWelcomeGlow 4s ease-in-out infinite' }} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la présentation de MAADEN AI"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-950/45 text-white/70 backdrop-blur-md transition hover:border-white/30 hover:bg-slate-950/70 hover:text-white"
        >
          <X size={17} />
        </button>

        <div className="relative z-10 flex min-h-[560px] sm:min-h-[530px] max-w-[590px] flex-col justify-center px-6 py-12 sm:px-11 lg:px-14">
          <div className="mb-7 flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-1.5 shadow-[0_0_28px_rgba(34,211,238,0.2)] backdrop-blur-md">
              <MaadenAILogo size={46} />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-wide text-white">MAADEN AI</p>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
                Intelligence opérationnelle
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={14} /> Votre copilote intelligent
          </div>
          <h1 id="maaden-ai-welcome-title" className="max-w-[540px] text-[34px] font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-[46px]">
            Éclairez chaque décision avec <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">MAADEN AI</span>
          </h1>
          <p className="mt-5 max-w-[510px] text-[13px] leading-6 text-slate-300 sm:text-[15px]">
            Analysez vos lampadaires, anticipez les pannes et optimisez l’énergie grâce à une réponse qui réunit vos données, vos procédures et les connaissances actuelles.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium text-slate-200 backdrop-blur-md">
                <Icon size={11} className="text-cyan-300" /> {label}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openAssistant}
              autoFocus
              className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-[13px] font-bold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(34,211,238,0.34)]"
            >
              Découvrir l’assistant MAADEN
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-3 text-[12px] font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Plus tard
            </button>
          </div>

          <p className="mt-5 max-w-[500px] text-[9px] leading-4 text-slate-500">
            Les recommandations restent une aide à la décision. Les actions opérationnelles doivent être validées par un utilisateur habilité.
          </p>
        </div>
      </section>
    </div>
  )
}
