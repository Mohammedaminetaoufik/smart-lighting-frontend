import { cn } from '../../../utils/helpers'

/**
 * Field wrapper that renders label, error, and helper text around any input.
 *
 * Props:
 *   label    — string
 *   error    — string (message) or undefined
 *   help     — optional helper text under the field
 *   required — show red asterisk
 *   children — the input element
 */
export default function Field({ label, error, help, required, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[12px] font-medium text-[var(--text-muted)]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {!error && help && <p className="text-[11px] text-[var(--text-muted)]">{help}</p>}
    </div>
  )
}

const inputClass = (hasError) => cn(
  'w-full px-3 py-2 text-sm bg-[var(--surface-2)] border rounded-lg text-[var(--text)]',
  'focus:outline-none focus:ring-2 focus:ring-brand-500/30',
  hasError ? 'border-red-500/60 focus:border-red-500' : 'border-[var(--border)] focus:border-brand-500'
)

export function FormInput({ label, error, help, required, register, ...rest }) {
  return (
    <Field label={label} error={error} help={help} required={required}>
      <input {...register} {...rest} className={cn(inputClass(!!error), rest.className)} />
    </Field>
  )
}

export function FormSelect({ label, error, help, required, register, children, ...rest }) {
  return (
    <Field label={label} error={error} help={help} required={required}>
      <select {...register} {...rest} className={cn(inputClass(!!error), rest.className)}>
        {children}
      </select>
    </Field>
  )
}

export function FormTextarea({ label, error, help, required, register, ...rest }) {
  return (
    <Field label={label} error={error} help={help} required={required}>
      <textarea {...register} {...rest} className={cn(inputClass(!!error), 'min-h-[80px] resize-y', rest.className)} />
    </Field>
  )
}
