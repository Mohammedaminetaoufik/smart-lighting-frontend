import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../../components/ui/Button'
import { FormInput, FormSelect } from '../../components/ui/form/Field'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Le nom doit faire au moins 2 caractères'),
  email: z.string().trim().toLowerCase().email('Email invalide'),
  role: z.enum(['admin', 'operator', 'viewer']),
  status: z.enum(['active', 'disabled']),
})

const DEFAULT = { full_name: '', email: '', role: 'viewer', status: 'active' }

export default function UserForm({ defaultValues, onSubmit, onCancel, busy, submitLabel = 'Enregistrer' }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? {
          full_name: defaultValues.full_name || '',
          email: defaultValues.email || '',
          role: defaultValues.role || 'viewer',
          status: defaultValues.status || 'active',
        }
      : DEFAULT,
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

      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Rôle" register={register('role')} error={errors.role?.message}>
          <option value="viewer">Lecteur</option>
          <option value="operator">Opérateur</option>
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
