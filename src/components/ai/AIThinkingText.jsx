import { useState, useEffect } from 'react'
import { Cpu, ShieldCheck, Database, Zap } from 'lucide-react'

const STEPS = [
  { icon: Cpu,         text: 'Génération de la requête SQL avec le moteur IA…',   color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20'  },
  { icon: ShieldCheck, text: 'Validation sécurisée avec SQLGuard…',                color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Database,    text: 'Lecture des données PostgreSQL…',                    color: 'text-purple-400',bg: 'bg-purple-500/10',border: 'border-purple-500/20'},
  { icon: Zap,         text: 'Préparation du résumé et des recommandations…',     color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
]

export default function AIThinkingText({ isLoading }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [dots, setDots]           = useState(0)
  const [progress, setProgress]   = useState(8)

  useEffect(() => {
    if (!isLoading) {
      setStepIndex(0)
      setDots(0)
      setProgress(8)
      return
    }

    // Step cycling — advance every 900ms, loop on last step
    const stepTimer = setInterval(() => {
      setStepIndex(i => (i < STEPS.length - 1 ? i + 1 : i))
    }, 900)

    // Animated dots (0 → 1 → 2 → 3 → 0 …)
    const dotsTimer = setInterval(() => {
      setDots(d => (d + 1) % 4)
    }, 400)

    // Smooth progress bar — crawls toward 90 then stalls
    const progressTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 88) return p
        const increment = p < 30 ? 4 : p < 60 ? 2.5 : p < 80 ? 1.2 : 0.4
        return Math.min(p + increment, 88)
      })
    }, 120)

    return () => {
      clearInterval(stepTimer)
      clearInterval(dotsTimer)
      clearInterval(progressTimer)
    }
  }, [isLoading])

  if (!isLoading) return null

  const step = STEPS[stepIndex]
  const Icon = step.icon
  const dotStr = '.'.repeat(dots).padEnd(3, ' ') // non-breaking spaces to keep stable width

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--border)] w-full">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Active step */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${step.bg} ${step.border}`}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${step.bg} ${step.color} shrink-0`}>
            <Icon size={16} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${step.color}`}>
              {step.text.replace('…', '')}{dotStr}
            </p>
          </div>
          {/* Bouncing dots indicator */}
          <div className="flex items-center gap-1 shrink-0">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${step.color.replace('text-', 'bg-')} opacity-80`}
                style={{
                  animation: 'bounce 1.2s ease-in-out infinite',
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Step breadcrumbs */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done    = i < stepIndex
            const current = i === stepIndex
            const StepIcon = s.icon
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-all duration-300
                  ${done    ? 'bg-green-500/20 text-green-400' :
                    current ? `${s.bg} ${s.color}` :
                              'bg-[var(--surface-2)] text-[var(--text-muted)] opacity-30'}
                `}>
                  <StepIcon size={11} />
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-all duration-500 ${done ? 'bg-green-500/30' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
