import { cn } from '../../utils/helpers'

export function BrandMark({ className }) {
  return (
    <svg
      viewBox="0 0 132 112"
      role="img"
      aria-label="MAADEN"
      className={cn('shrink-0 overflow-visible', className)}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M53 12C45 14 40 20 35 29L7 83c-5 10 1 20 12 20h58" strokeWidth="7" />
        <path d="M36 89l25-49c3-7 11-7 15 0l30 57c4 8 14 9 20 3 4-4 4-9 1-14l-18-34" strokeWidth="7" />
        <path d="M36 89h39" strokeWidth="7" />
        <path d="M76 14c8 3 13 9 18 18l9 17" strokeWidth="4" />
      </g>
      <g fill="#13aae1">
        <circle cx="55" cy="10" r="7" />
        <circle cx="106" cy="50" r="7" />
      </g>
      <g fill="none" stroke="#13aae1" strokeLinecap="round" strokeWidth="3">
        <path d="M111 40l4-9" />
        <path d="M116 46l10-5" />
        <path d="M117 54l10 3" />
        <path d="M112 60l5 8" />
      </g>
    </svg>
  )
}

export default function BrandLogo({ compact = false, size = 'default', className }) {
  const sizes = {
    small: { mark: 'w-9 h-9', word: 'text-[13px]', tagline: 'text-[7px]', gap: 'gap-2' },
    default: { mark: 'w-12 h-12', word: 'text-[18px]', tagline: 'text-[9px]', gap: 'gap-2.5' },
    large: { mark: 'w-[82px] h-[82px]', word: 'text-[34px]', tagline: 'text-[14px]', gap: 'gap-4' },
  }
  const current = sizes[size] || sizes.default

  if (compact) {
    return <BrandMark className={cn(current.mark, 'text-[var(--logo-ink)]', className)} />
  }

  return (
    <div className={cn('inline-flex items-center text-[var(--logo-ink)]', current.gap, className)}>
      <BrandMark className={current.mark} />
      <span className="min-w-0 leading-none">
        <span className={cn('block font-medium tracking-[0.16em] whitespace-nowrap', current.word)}>
          MAADEN
        </span>
        <span className={cn('block mt-1 font-normal tracking-[0.015em] whitespace-nowrap text-[var(--logo-ink)] opacity-75', current.tagline)}>
          Smart Controlling
        </span>
      </span>
    </div>
  )
}
