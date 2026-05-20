import { useEffect, useState } from 'react'
import { Plus, Workflow, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProfiles, createProfile, enableProfile, disableProfile } from '../../api/profiles'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { cn } from '../../utils/helpers'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const INITIAL_FORM = { name: '', target_type: 'zone', target_value: '', schedules: [{ start_time: '20:00', end_time: '06:00', intensity: 80, days_of_week: '1,2,3,4,5,6,7' }] }

function ScheduleBar({ schedules }) {
  return (
    <div className="relative h-6 bg-[var(--surface-2)] rounded overflow-hidden">
      {(schedules || []).map((s, i) => {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        let startPct = (sh * 60 + sm) / (24 * 60) * 100
        let endPct = (eh * 60 + em) / (24 * 60) * 100
        if (endPct < startPct) endPct = 100
        return (
          <div key={i}
            className="absolute top-0 h-full bg-brand-500/70 flex items-center justify-center text-[9px] text-white font-bold"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          >
            {s.intensity}%
          </div>
        )
      })}
      {[0, 6, 12, 18].map((h) => (
        <div key={h} className="absolute top-0 h-full border-l border-white/20" style={{ left: `${h / 24 * 100}%` }}>
          <span className="text-[8px] text-white/50 ml-0.5">{h}h</span>
        </div>
      ))}
    </div>
  )
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)

  const load = () => {
    setLoading(true)
    getProfiles()
      .then((r) => setProfiles(Array.isArray(r) ? r : r?.profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleToggle = async (profile) => {
    setToggling(profile.id)
    try {
      if (profile.enabled) {
        await disableProfile(profile.id)
        toast.success('Profil désactivé')
      } else {
        await enableProfile(profile.id)
        toast.success('Profil activé')
      }
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setToggling(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createProfile(form)
      toast.success('Profil créé')
      setModal(false)
      setForm(INITIAL_FORM)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setModal(true)}><Plus size={14} /> Nouveau profil</Button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState icon={Workflow} title="Aucun profil" description="Créez un profil d'éclairage basé sur des plages horaires." action={<Button onClick={() => setModal(true)}>Créer</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[14px] text-[var(--text)]">{p.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{p.target_type} · {p.target_value}</p>
                </div>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={toggling === p.id}
                  className={cn('text-2xl transition-colors', p.enabled ? 'text-brand-500' : 'text-[var(--border)]', toggling === p.id && 'opacity-50')}
                >
                  {p.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
              <ScheduleBar schedules={p.schedules} />
              <div className="mt-3 space-y-1">
                {(p.schedules || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">{s.start_time} → {s.end_time}</span>
                    <span className="font-bold text-brand-500">{s.intensity}%</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau profil d'éclairage">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Nom *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Cible</label>
              <select value={form.target_type} onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                {['zone', 'group', 'lcu'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Valeur</label>
              <input value={form.target_value} onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
                placeholder="zone-a, groupe-1…"
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[var(--text-muted)] mb-2">Plage horaire principale</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-[var(--text-muted)]">Début</label>
                <input type="time" value={form.schedules[0].start_time}
                  onChange={(e) => setForm((f) => ({ ...f, schedules: [{ ...f.schedules[0], start_time: e.target.value }] }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)]">Fin</label>
                <input type="time" value={form.schedules[0].end_time}
                  onChange={(e) => setForm((f) => ({ ...f, schedules: [{ ...f.schedules[0], end_time: e.target.value }] }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)]">Intensité %</label>
                <input type="number" min={0} max={100} value={form.schedules[0].intensity}
                  onChange={(e) => setForm((f) => ({ ...f, schedules: [{ ...f.schedules[0], intensity: +e.target.value }] }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
