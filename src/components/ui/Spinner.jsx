import { cn } from '../../utils/helpers'

export default function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <span
      className={cn(
        'inline-block border-2 border-[var(--border)] border-t-brand-500 rounded-full animate-spin',
        s[size],
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}
