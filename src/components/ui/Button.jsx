import { cn } from '../../utils/helpers'

const variants = {
  primary:   'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
  secondary: 'bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)]',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  ghost:     'hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]',
  outline:   'border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text)]',
}

const sizes = {
  sm:  'px-3 py-1.5 text-xs gap-1.5',
  md:  'px-4 py-2 text-sm gap-2',
  lg:  'px-5 py-2.5 text-sm gap-2',
  icon:'p-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
