import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormInput, FormSelect } from '../../components/ui/form/Field'

const baseSchema = z.object({
  full_name: z.string().trim().min(2, 'Le nom doit faire au moins 2 caractères'),
  email:     z.string().trim().toLowerCase().email('Email invalide'),
  role:      z.enum(['admin', 'operator']),
  status:    z.enum(['active', 'disabled']),
})

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Au moins 8 caractères requis'),
})

const DEFAULT_CREATE = { full_name: '', email: '', role: 'operator', status: 'active', password: '' }
const DEFAULT_EDIT   = { full_name: '', email: '', role: 'operator', status: 'active' }

export default function UserForm({ defaultValues, onSubmit, onCancel, busy, submitLabel = 'Enregistrer' }) {
  const isEdit = !!defaultValues
  const [showPwd, setShowPwd] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? baseSchema : createSchema),
    defaultValues: isEdit
      ? {
          full_name: defaultValues.full_name || '',
          email:     defaultValues.email     || '',
          role:      defaultValues.role      || 'viewer',
          status:    defaultValues.status    || 'active',
        }
      : DEFAULT_CREATE,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        label="Nom complet"
        required
        placeholder="ex: Karim Bensalem"
        register={register('full_name')}
        error={errors.full_name?.message}
      />

      <FormInput
        label="Email"
        type="email"
        required
        placeholder="utilisateur@exemple.com"
        register={register('email')}
        error={errors.email?.message}
      />

      {!isEdit && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Mot de passe <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 caractères"
              {...register('password')}
              className="w-full px-3 py-2.5 pr-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Rôle" register={register('role')} error={errors.role?.message}>
          <option value="operator">Technicien</option>
          <option value="admin">Administrateur</option>
        </FormSelect>

        <FormSelect label="Statut" register={register('status')} error={errors.status?.message}>
          <option value="active">Actif</option>
          <option value="disabled">Désactivé</option>
        </FormSelect>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={busy}>{submitLabel}</Button>
      </div>
    </form>
  )
}
