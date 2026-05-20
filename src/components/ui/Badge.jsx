import { cn } from '../../utils/helpers'

export default function Badge({ label, bg, text, dot, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', bg, text, className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {label}
    </span>
  )
}
