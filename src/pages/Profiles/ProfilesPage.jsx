import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Workflow, ToggleLeft, ToggleRight,
  Clock, Target, Trash2, CalendarDays, Zap,
  CheckCircle, AlertTriangle, ChevronDown, X,
  Edit2, Layers, WifiOff, Wifi,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getProfiles, createProfile, updateProfile, applyProfile,
  enableProfile, disableProfile, deleteProfile, getGroups, getProfileDetails,
} from '../../api/profiles'
import { getLCUs } from '../../api/lcus'
import { getLampadaires } from '../../api/lampadaires'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { cn } from '../../utils/helpers'

const ALL_DAYS    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SEG_COLORS  = ['#22c55e', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899']
const TARGET_OPTS = [
  { value: 'zone',  label: 'Zone géographique', placeholder: 'zone-a' },
  { value: 'lcu',   label: 'Passerelle LCU',    placeholder: 'LCU-001' },
  { value: 'group', label: 'Groupe',             placeholder: 'groupe-1' },
]
const EMPTY_SCH = { start_time: '20:00', end_time: '06:00', intensity: 80, days_of_week: '1,2,3,4,5,6,7' }
const INIT_FORM = { name: '', description: '', target_type: 'zone', target_value: '', enabled: true, schedules: [{ ...EMPTY_SCH }] }

const TYPE_STYLE = {
  lcu:   { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  zone:  { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  group: { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.3)'  },
}

/* ── helpers ── */
function toMin(t) {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}
function activeDays(s) {
  return (s || '1,2,3,4,5,6,7').split(',').map(Number)
}
function lampStatusColor(etat) {
  if (etat === 'online')      return '#22c55e'
  if (etat === 'offline')     return '#ef4444'
  if (etat === 'maintenance') return '#f59e0b'
  return '#6b7280'
}

/* ──────────────────────────────────────────────────────────────
   24-HOUR TIMELINE (handles midnight-wrapping)
───────────────────────────────────────────────────────────── */
function Timeline({ schedules = [] }) {
  const TOTAL = 24 * 60
  const segs = schedules.flatMap((s, i) => {
    const col   = SEG_COLORS[i % SEG_COLORS.length]
    const start = toMin(s.start_time)
    const end   = toMin(s.end_time)
    if (end > start) {
      return [{ left: start / TOTAL * 100, width: (end - start) / TOTAL * 100, col, label: `${s.intensity}%` }]
    }
    return [
      { left: start / TOTAL * 100, width: (TOTAL - start) / TOTAL * 100, col, label: `${s.intensity}%` },
      { left: 0, width: end / TOTAL * 100, col, label: '' },
    ]
  })

  return (
    <div className="relative h-9 bg-[var(--surface-2)] rounded-xl overflow-hidden border border-[var(--border)]">
      {segs.map((seg, i) => (
        <div key={i} className="absolute top-0 h-full flex items-center justify-center text-[9px] font-bold text-white/90"
          style={{ left: `${seg.left}%`, width: `${seg.width}%`, background: `${seg.col}88` }}>
          {seg.label}
        </div>
      ))}
      {[0, 6, 12, 18].map((h) => (
        <div key={h} className="absolute top-0 h-full border-l border-white/10"
          style={{ left: `${h / 24 * 100}%` }}>
          <span className="absolute bottom-0.5 left-0.5 text-[8px] text-[var(--text-muted)]">{h}h</span>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   DAY PICKER
───────────────────────────────────────────────────────────── */
function DayPicker({ value, onChange }) {
  const days = activeDays(value)
  const toggle = (d) => {
    const next = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d].sort((a, b) => a - b)
    onChange(next.length ? next.join(',') : '1')
  }
  return (
    <div className="flex gap-1.5">
      {ALL_DAYS.map((label, i) => {
        const num    = i + 1
        const active = days.includes(num)
        return (
          <button key={label} type="button" onClick={() => toggle(num)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border',
              active
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-500'
                : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:border-brand-500/30 hover:text-[var(--text)]'
            )}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   SCHEDULE ROW
───────────────────────────────────────────────────────────── */
function ScheduleRow({ s, idx, color, onChange, onRemove, canRemove }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="h-1" style={{ background: color }} />
      <div className="p-3 bg-[var(--surface-2)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-[var(--text-muted)] mb-1 block">Début</label>
              <input type="time" value={s.start_time}
                onChange={(e) => onChange(idx, 'start_time', e.target.value)}
                className="w-full px-2.5 py-2 text-[13px] font-medium bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div className="text-[var(--text-muted)] mt-4 text-[12px]">→</div>
            <div className="flex-1">
              <label className="text-[10px] font-medium text-[var(--text-muted)] mb-1 block">Fin</label>
              <input type="time" value={s.end_time}
                onChange={(e) => onChange(idx, 'end_time', e.target.value)}
                className="w-full px-2.5 py-2 text-[13px] font-medium bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>
          <div className="w-36">
            <div className="flex justify-between mb-1">
              <label className="text-[10px] font-medium text-[var(--text-muted)]">Intensité</label>
              <span className="text-[11px] font-bold" style={{ color }}>{s.intensity}%</span>
            </div>
            <input type="range" min={0} max={100} value={s.intensity}
              onChange={(e) => onChange(idx, 'intensity', +e.target.value)}
              style={{ accentColor: color }}
              className="w-full h-1.5" />
          </div>
          {canRemove && (
            <button type="button" onClick={() => onRemove(idx)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0 self-end mb-0.5">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   SHARED FORM HELPERS
───────────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}
const inputCls = 'w-full px-3 py-2.5 text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all'

function SectionTitle({ icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
    </div>
  )
}

/* Shared hook to load dropdown options */
function useTargetOpts() {
  const [opts, setOpts]       = useState({ lcu: [], zone: [], group: [] })
  const [loading, setLoading] = useState(false)
  const load = () => {
    setLoading(true)
    Promise.all([
      getLCUs().catch(() => []),
      getLampadaires().catch(() => []),
      getGroups().catch(() => []),
    ]).then(([lcuData, lampData, groupData]) => {
      const lcuList   = Array.isArray(lcuData)   ? lcuData   : lcuData?.lcus        || []
      const lampList  = Array.isArray(lampData)  ? lampData  : lampData?.lampadaires || []
      const groupList = Array.isArray(groupData) ? groupData : groupData?.groups     || []
      const zones = [...new Set(lampList.map((l) => l.zone).filter(Boolean))].sort()
      setOpts({
        lcu:   lcuList.map((l)   => ({ value: l.reference, label: `${l.reference}${l.zone ? ' — ' + l.zone : ''}` })),
        zone:  zones.map((z)     => ({ value: z, label: z })),
        group: groupList.map((g) => ({ value: g.name, label: g.name })),
      })
    }).finally(() => setLoading(false))
  }
  return { opts, optsLoading: loading, loadOpts: load }
}

function TargetValueField({ form, setForm, opts, optsLoading }) {
  const targetOpt = TARGET_OPTS.find((o) => o.value === form.target_type) || TARGET_OPTS[0]
  if (optsLoading) {
    return (
      <div className={cn(inputCls, 'flex items-center gap-2 text-[var(--text-muted)]')}>
        <span className="w-3 h-3 rounded-full border-2 border-brand-500/40 border-t-brand-500 animate-spin shrink-0" />
        <span className="text-[12px]">Chargement…</span>
      </div>
    )
  }
  if (opts[form.target_type]?.length > 0) {
    return (
      <div className="relative">
        <select value={form.target_value}
          onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
          className={cn(inputCls, 'appearance-none pr-8 cursor-pointer')}>
          <option value="">— Sélectionner —</option>
          {opts[form.target_type].map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
      </div>
    )
  }
  return (
    <input value={form.target_value}
      onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
      placeholder={targetOpt.placeholder}
      className={inputCls} />
  )
}

/* ──────────────────────────────────────────────────────────────
   CREATE MODAL
───────────────────────────────────────────────────────────── */
function CreateProfileModal({ open, onClose, onCreated, initialForm }) {
  const [form,   setForm]   = useState(INIT_FORM)
  const [saving, setSaving] = useState(false)
  const { opts, optsLoading, loadOpts } = useTargetOpts()

  useEffect(() => {
    if (!open) return
    setForm(initialForm ? { ...INIT_FORM, ...initialForm } : { ...INIT_FORM })
    loadOpts()
  }, [open]) // eslint-disable-line

  const updSch = (idx, k, v) =>
    setForm((f) => ({ ...f, schedules: f.schedules.map((s, i) => i === idx ? { ...s, [k]: v } : s) }))
  const addSch = () =>
    setForm((f) => f.schedules.length < 4 ? { ...f, schedules: [...f.schedules, { ...EMPTY_SCH }] } : f)
  const rmSch = (idx) =>
    setForm((f) => ({ ...f, schedules: f.schedules.filter((_, i) => i !== idx) }))
  const setDays = (v) =>
    setForm((f) => ({ ...f, schedules: f.schedules.map((s) => ({ ...s, days_of_week: v })) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    try {
      await createProfile(form)
      toast.success('Profil créé')
      onClose()
      onCreated()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="">
      <form onSubmit={handleSubmit} className="-mt-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(34,197,94,0.15)' }}>
            <Workflow size={18} className="text-brand-500" />
          </div>
          <div>
            <p className="font-bold text-[16px] text-[var(--text)]">Nouveau profil d'éclairage</p>
            <p className="text-[12px] text-[var(--text-muted)]">Définissez les plages horaires et la cible</p>
          </div>
        </div>

        {/* Identification */}
        <div className="mb-5">
          <SectionTitle icon={<Target size={12} />} label="Identification" />
          <div className="space-y-3 mt-3">
            <Field label="Nom du profil *">
              <input required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Éclairage nocturne Zone A"
                className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type de cible">
                <div className="relative">
                  <select value={form.target_type}
                    onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value, target_value: '' }))}
                    className={cn(inputCls, 'appearance-none pr-8 cursor-pointer')}>
                    {TARGET_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </Field>
              <Field label={TARGET_OPTS.find((o) => o.value === form.target_type)?.label || 'Valeur'}>
                <TargetValueField form={form} setForm={setForm} opts={opts} optsLoading={optsLoading} />
              </Field>
            </div>
          </div>
        </div>

        {/* Schedules */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<Clock size={12} />} label="Plages horaires" />
            <button type="button" onClick={addSch} disabled={form.schedules.length >= 4}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:text-brand-400 disabled:opacity-30 transition-colors">
              <Plus size={12} /> Ajouter
            </button>
          </div>
          <div className="mt-3"><Timeline schedules={form.schedules} /></div>
          <div className="mt-3 space-y-2">
            {form.schedules.map((s, i) => (
              <ScheduleRow key={i} s={s} idx={i}
                color={SEG_COLORS[i % SEG_COLORS.length]}
                onChange={updSch} onRemove={rmSch}
                canRemove={form.schedules.length > 1} />
            ))}
          </div>
        </div>

        {/* Days */}
        <div className="mb-6">
          <SectionTitle icon={<CalendarDays size={12} />} label="Jours actifs" />
          <div className="mt-3">
            <DayPicker value={form.schedules[0]?.days_of_week} onChange={setDays} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Zap size={11} className="text-brand-500" />
            <span>{form.schedules.length} plage{form.schedules.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={saving}>
              <CheckCircle size={13} /> Créer le profil
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* ──────────────────────────────────────────────────────────────
   PROFILE CARD
───────────────────────────────────────────────────────────── */
function ProfileCard({ profile, onToggle, onDelete, onSelect, toggling, deleting }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const tc = TYPE_STYLE[profile.target_type] || TYPE_STYLE.zone

  return (
    <Card className="cursor-pointer hover:border-brand-500/30 transition-colors"
      onClick={() => onSelect(profile.id)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <p className="font-bold text-[14px] text-[var(--text)] truncate">{profile.name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
              {profile.target_type}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate">{profile.target_value}</span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggle(profile) }} disabled={toggling === profile.id}
          className={cn('shrink-0 transition-opacity', toggling === profile.id && 'opacity-50')}>
          {profile.enabled
            ? <ToggleRight size={30} className="text-brand-500" />
            : <ToggleLeft  size={30} className="text-[var(--border)]" />}
        </button>
      </div>

      <Timeline schedules={profile.schedules} />

      <div className="mt-3 space-y-1.5">
        {(profile.schedules || []).map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
            <span className="text-[var(--text-muted)] flex-1">{s.start_time} → {s.end_time}</span>
            <span className="font-bold" style={{ color: SEG_COLORS[i % SEG_COLORS.length] }}>{s.intensity}%</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 text-[11px]',
          profile.enabled ? 'text-green-500' : 'text-[var(--text-muted)]')}>
          {profile.enabled
            ? <><CheckCircle size={11} /> <span>Actif</span></>
            : <><span className="w-2 h-2 rounded-full bg-[var(--border)]" /> <span>Inactif</span></>}
        </div>

        {confirmDel ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] text-red-400">Confirmer ?</span>
            <button onClick={() => onDelete(profile.id)} disabled={deleting === profile.id}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50">
              {deleting === profile.id ? '…' : 'Supprimer'}
            </button>
            <button onClick={() => setConfirmDel(false)}
              className="px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              Annuler
            </button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true) }}
            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-red-400 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-400/8">
            <Trash2 size={12} /> Supprimer
          </button>
        )}
      </div>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────
   PROFILE DETAIL PANEL (slide-in drawer)
───────────────────────────────────────────────────────────── */
function ProfileDetailPanel({ profileId, onClose, onUpdated, onToggle, toggling }) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editMode,  setEditMode]  = useState(false)
  const [form,      setForm]      = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [applying,  setApplying]  = useState(false)
  const [lampFilter, setLampFilter] = useState('all')
  const { opts, optsLoading, loadOpts } = useTargetOpts()

  const load = () => {
    setLoading(true)
    getProfileDetails(profileId)
      .then((r) => {
        setData(r)
        setForm({
          name:         r.profile.name,
          description:  r.profile.description || '',
          target_type:  r.profile.target_type,
          target_value: r.profile.target_value,
          enabled:      r.profile.enabled,
          schedules:    r.profile.schedules?.length ? r.profile.schedules : [{ ...EMPTY_SCH }],
        })
      })
      .catch(() => toast.error('Impossible de charger les détails'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setEditMode(false)
    setLampFilter('all')
    load()
    loadOpts()
  }, [profileId]) // eslint-disable-line

  const updSch = (idx, k, v) =>
    setForm((f) => ({ ...f, schedules: f.schedules.map((s, i) => i === idx ? { ...s, [k]: v } : s) }))
  const addSch = () =>
    setForm((f) => f.schedules.length < 4 ? { ...f, schedules: [...f.schedules, { ...EMPTY_SCH }] } : f)
  const rmSch  = (idx) =>
    setForm((f) => ({ ...f, schedules: f.schedules.filter((_, i) => i !== idx) }))
  const setDays = (v) =>
    setForm((f) => ({ ...f, schedules: f.schedules.map((s) => ({ ...s, days_of_week: v })) }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    try {
      await updateProfile(profileId, form)
      toast.success('Profil mis à jour')
      setEditMode(false)
      load()
      onUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      const r = await applyProfile(profileId, {})
      toast.success(`Appliqué — ${r?.count ?? 0} lampadaire(s) mis à jour`)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setApplying(false)
    }
  }

  const profile        = data?.profile
  const lamps          = data?.lamps || []
  const filteredLamps  = lampFilter === 'problems' ? lamps.filter((l) => l.problem) : lamps
  const onlineCnt      = lamps.filter((l) => l.etat === 'online').length
  const offlineCnt     = lamps.filter((l) => l.etat === 'offline').length
  const tc             = TYPE_STYLE[profile?.target_type] || TYPE_STYLE.zone

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[500px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><PageLoader /></div>
        ) : (
          <>
            {/* ── Panel header ── */}
            <div className="flex items-start gap-3 p-5 pb-4 border-b border-[var(--border)] shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
                    {profile.target_type}
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)] truncate">{profile.target_value}</span>
                </div>
                <p className="font-bold text-[18px] text-[var(--text)] leading-tight truncate">{profile.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditMode((v) => !v) }}
                  className={cn(
                    'p-2 rounded-xl border text-[12px] font-medium transition-all flex items-center gap-1.5',
                    editMode
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-500'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  )}>
                  <Edit2 size={13} />
                </button>
                <button onClick={() => onToggle(profile)} disabled={toggling === profile.id}
                  className={cn('p-1 transition-opacity', toggling === profile.id && 'opacity-50')}>
                  {profile.enabled
                    ? <ToggleRight size={26} className="text-brand-500" />
                    : <ToggleLeft  size={26} className="text-[var(--border)]" />}
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition-all">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">

              {/* Apply button */}
              <div className="px-5 pt-4 pb-0">
                <button onClick={handleApply} disabled={applying}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[13px] transition-all border"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    borderColor: 'rgba(34,197,94,0.3)',
                    color: '#22c55e',
                    opacity: applying ? 0.6 : 1,
                  }}>
                  {applying
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-green-500/40 border-t-green-500 animate-spin" /> Application…</>
                    : <><Zap size={14} /> Appliquer maintenant</>}
                </button>
              </div>

              {/* Edit form */}
              {editMode && form ? (
                <form onSubmit={handleSave} className="px-5 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={<Edit2 size={12} />} label="Modification" />
                  </div>

                  <Field label="Nom du profil">
                    <input value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputCls} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type de cible">
                      <div className="relative">
                        <select value={form.target_type}
                          onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value, target_value: '' }))}
                          className={cn(inputCls, 'appearance-none pr-8 cursor-pointer')}>
                          {TARGET_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      </div>
                    </Field>
                    <Field label={TARGET_OPTS.find((o) => o.value === form.target_type)?.label || 'Valeur'}>
                      <TargetValueField form={form} setForm={setForm} opts={opts} optsLoading={optsLoading} />
                    </Field>
                  </div>

                  {/* Schedules in edit mode */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <SectionTitle icon={<Clock size={12} />} label="Plages horaires" />
                      <button type="button" onClick={addSch} disabled={form.schedules.length >= 4}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:text-brand-400 disabled:opacity-30 transition-colors">
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                    <Timeline schedules={form.schedules} />
                    <div className="mt-3 space-y-2">
                      {form.schedules.map((s, i) => (
                        <ScheduleRow key={i} s={s} idx={i}
                          color={SEG_COLORS[i % SEG_COLORS.length]}
                          onChange={updSch} onRemove={rmSch}
                          canRemove={form.schedules.length > 1} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle icon={<CalendarDays size={12} />} label="Jours actifs" />
                    <div className="mt-2">
                      <DayPicker value={form.schedules[0]?.days_of_week} onChange={setDays} />
                    </div>
                  </div>

                  <div className="flex gap-2 pb-5">
                    <Button type="button" variant="secondary" onClick={() => setEditMode(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button type="submit" loading={saving} className="flex-1">
                      <CheckCircle size={13} /> Enregistrer
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── View mode ── */
                <div className="px-5 pt-5 space-y-5 pb-6">
                  {/* Timeline + schedules */}
                  <div>
                    <SectionTitle icon={<Clock size={12} />} label="Plages horaires" />
                    <div className="mt-2"><Timeline schedules={profile.schedules} /></div>
                    <div className="mt-3 space-y-1.5">
                      {(profile.schedules || []).map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                          <span className="font-medium text-[var(--text)]">{s.start_time}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="font-medium text-[var(--text)]">{s.end_time}</span>
                          <span className="flex-1" />
                          <span className="font-bold" style={{ color: SEG_COLORS[i % SEG_COLORS.length] }}>{s.intensity}%</span>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                            {ALL_DAYS.filter((_, idx) => activeDays(s.days_of_week).includes(idx + 1)).join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lamp stats */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <SectionTitle icon={<Layers size={12} />} label={`Lampadaires (${data.total})`} />
                      <div className="flex gap-1">
                        {['all', 'problems'].map((f) => (
                          <button key={f} onClick={() => setLampFilter(f)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                              f === lampFilter
                                ? f === 'problems'
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                  : 'bg-brand-500/15 text-brand-500 border border-brand-500/30'
                                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                            )}>
                            {f === 'all' ? 'Tous' : `⚠ ${data.problematic} problème${data.problematic > 1 ? 's' : ''}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: 'Total',      value: data.total,       color: 'text-[var(--text)]',  icon: <Layers size={12} /> },
                        { label: 'En ligne',   value: onlineCnt,        color: 'text-green-500',       icon: <Wifi size={12} /> },
                        { label: 'Hors ligne', value: offlineCnt,       color: 'text-red-400',         icon: <WifiOff size={12} /> },
                        { label: 'Problèmes',  value: data.problematic, color: 'text-orange-400',      icon: <AlertTriangle size={12} /> },
                      ].map((stat) => (
                        <div key={stat.label}
                          className="bg-[var(--surface-2)] rounded-xl p-2.5 text-center border border-[var(--border)] flex flex-col items-center gap-1">
                          <span className={stat.color}>{stat.icon}</span>
                          <p className={cn('text-[18px] font-bold leading-tight', stat.color)}>{stat.value}</p>
                          <p className="text-[9px] text-[var(--text-muted)] leading-tight">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Lamp list */}
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
                      {filteredLamps.length === 0 ? (
                        <p className="text-center text-[12px] text-[var(--text-muted)] py-8">
                          {lampFilter === 'problems' ? 'Aucun problème détecté' : 'Aucun lampadaire associé'}
                        </p>
                      ) : filteredLamps.map((l) => (
                        <div key={l.id}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12px]',
                            l.problem
                              ? 'border-orange-500/20 bg-orange-500/5'
                              : 'border-[var(--border)] bg-[var(--surface-2)]'
                          )}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lampStatusColor(l.etat) }} />
                          <span className="font-medium text-[var(--text)] flex-1 truncate min-w-0">{l.reference}</span>
                          <span className="text-[var(--text-muted)] text-[11px] shrink-0 hidden sm:block">{l.zone}</span>
                          {l.intensite != null && (
                            <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0 w-7 text-right">{l.intensite}%</span>
                          )}
                          {l.problem && (
                            <span className="flex items-center gap-1 text-[10px] text-orange-400 shrink-0 max-w-[110px] truncate" title={l.problem}>
                              <AlertTriangle size={9} className="shrink-0" />
                              {l.problem}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function ProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [profiles,     setProfiles]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [initForm,     setInitForm]     = useState(null)
  const [toggling,     setToggling]     = useState(null)
  const [deleting,     setDeleting]     = useState(null)
  const [selectedId,   setSelectedId]   = useState(null)

  const load = () => {
    setLoading(true)
    getProfiles()
      .then((r) => setProfiles(Array.isArray(r) ? r : r?.profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setInitForm({
        name:         searchParams.get('name')         || '',
        target_type:  searchParams.get('target_type')  || 'zone',
        target_value: searchParams.get('target_value') || '',
        schedules:    [{ ...EMPTY_SCH }],
      })
      setModal(true)
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line

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

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await deleteProfile(id)
      toast.success('Profil supprimé')
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const openCreate = () => { setInitForm(null); setModal(true) }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus size={14} /> Nouveau profil</Button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState icon={Workflow} title="Aucun profil"
          description="Créez un profil d'éclairage basé sur des plages horaires."
          action={<Button onClick={openCreate}>Créer</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onSelect={setSelectedId}
              toggling={toggling}
              deleting={deleting} />
          ))}
        </div>
      )}

      <CreateProfileModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={load}
        initialForm={initForm}
      />

      {selectedId != null && (
        <ProfileDetailPanel
          profileId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
          onToggle={handleToggle}
          toggling={toggling}
        />
      )}
    </div>
  )
}
