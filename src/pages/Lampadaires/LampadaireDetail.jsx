import { useEffect, useState } from 'react'
import {
  X, Zap, Thermometer, Droplets, Eye, Activity, Cpu, Shield,
  Gauge, Wifi, Clock, AlertTriangle, CheckCircle, Edit2, Save,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import {
  getLatestTelemetry, getTelemetry, getDimmingHistory, setDimming,
  getDecisions, patchLampadaire,
} from '../../api/lampadaires'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { statusColor, labelStatus, commissioningColor, labelCommissioning, formatDate, cn } from '../../utils/helpers'

const TABS = ['Info', 'Contrôleur', 'Télémétrie', 'Dimming', 'Décisions', 'Éditer']

const inputCls = 'w-full px-3 py-2 text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function LampadaireDetail({ lamp: initialLamp, onClose, onUpdate }) {
  const [lamp, setLamp]     = useState(initialLamp)
  const [tab, setTab]       = useState('Info')
  const [latest, setLatest] = useState(null)
  const [telemetry, setTelemetry]   = useState([])
  const [dimHistory, setDimHistory] = useState([])
  const [decisions, setDecisions]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [dimValue, setDimValue]     = useState(initialLamp.intensite ?? 60)
  const [dimming, setDimmingLoading] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    zone:        lamp.zone        || '',
    type_driver: lamp.type_driver || '',
    protocole:   lamp.protocole   || '',
    puissance:   lamp.puissance   ?? '',
    address:     lamp.address     || '',
    quartier:    lamp.quartier    || '',
    notes:       lamp.notes       || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLatestTelemetry(lamp.id).catch(() => null),
      getTelemetry(lamp.id, { limit: 50 }).catch(() => []),
      getDimmingHistory(lamp.id).catch(() => []),
      getDecisions(lamp.id).catch(() => []),
    ]).then(([lt, tel, dim, dec]) => {
      setLatest(lt)
      setTelemetry(Array.isArray(tel) ? tel : tel?.measurements || [])
      setDimHistory(Array.isArray(dim) ? dim : dim?.commands || [])
      setDecisions(Array.isArray(dec) ? dec : dec?.decisions || [])
    }).finally(() => setLoading(false))
  }, [lamp.id])

  const handleDim = async () => {
    setDimmingLoading(true)
    try {
      await setDimming(lamp.id, { intensity: dimValue, reason: 'Manuel' })
      toast.success(`Intensité réglée à ${dimValue}%`)
      const updated = { ...lamp, intensite: dimValue }
      setLamp(updated)
      onUpdate?.(updated)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDimmingLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        puissance: editForm.puissance !== '' ? Number(editForm.puissance) : undefined,
      }
      const updated = await patchLampadaire(lamp.id, payload)
      const next = updated?.data ?? updated ?? lamp
      setLamp(next)
      setEditForm({
        zone:        next.zone        || '',
        type_driver: next.type_driver || '',
        protocole:   next.protocole   || '',
        puissance:   next.puissance   ?? '',
        address:     next.address     || '',
        quartier:    next.quartier    || '',
        notes:       next.notes       || '',
      })
      toast.success('Lampadaire mis à jour')
      onUpdate?.(next)
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  const sc = statusColor(lamp.etat)
  const cc = commissioningColor(lamp.commissioning_status)

  const telChartData = telemetry.slice(-30).map((t) => ({
    time: new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    luminosite: t.luminosite,
    temperature: t.temperature,
    puissance: t.puissance,
  }))

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-[var(--surface)] border-l border-[var(--border)] flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <p className="font-bold text-[16px] text-[var(--text)]">{lamp.reference}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge label={labelStatus(lamp.etat)} bg={sc.bg} text={sc.text} dot={sc.dot} />
              <Badge label={labelCommissioning(lamp.commissioning_status)} bg={cc.bg} text={cc.text} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('Éditer')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all',
                tab === 'Éditer'
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-500'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              )}>
              <Edit2 size={12} /> Éditer
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'py-3 px-1 mr-5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
                tab === t
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && tab !== 'Éditer' && <PageLoader />}

          {/* ── Info ── */}
          {!loading && tab === 'Info' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Zone',              value: lamp.zone },
                  { label: 'Driver',            value: lamp.type_driver },
                  { label: 'Protocole',         value: lamp.protocole },
                  { label: 'Puissance nominale', value: lamp.puissance ? `${lamp.puissance}W` : null },
                  { label: 'Device UID',        value: lamp.device_uid },
                  { label: 'Node address',      value: lamp.node_address },
                ].map((row) => (
                  <div key={row.label} className="bg-[var(--surface-2)] rounded-lg p-3">
                    <p className="text-[11px] text-[var(--text-muted)]">{row.label}</p>
                    <p className="text-[13px] font-medium text-[var(--text)] mt-0.5 truncate">{row.value || '—'}</p>
                  </div>
                ))}
              </div>

              {latest && (
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text)] mb-3">Dernières mesures</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Eye,        label: 'Luminosité',  value: latest.luminosite  != null ? `${latest.luminosite.toFixed(1)}%`   : null },
                      { icon: Thermometer,label: 'Température', value: latest.temperature != null ? `${latest.temperature.toFixed(1)}°C` : null },
                      { icon: Droplets,   label: 'Humidité',   value: latest.humidite    != null ? `${latest.humidite.toFixed(1)}%`     : null },
                      { icon: Zap,        label: 'Puissance',  value: latest.puissance   != null ? `${latest.puissance.toFixed(1)}W`    : null },
                      { icon: Activity,   label: 'Tension',    value: latest.tension     != null ? `${latest.tension.toFixed(1)}V`      : null },
                      { icon: Activity,   label: 'Énergie',    value: latest.energie     != null ? `${latest.energie.toFixed(3)}kWh`    : null },
                    ].filter((r) => r.value).map((row) => (
                      <div key={row.label} className="bg-[var(--surface-2)] rounded-lg p-3 flex items-start gap-2">
                        <row.icon size={14} className="text-brand-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)]">{row.label}</p>
                          <p className="text-[14px] font-bold text-[var(--text)]">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[13px] font-semibold text-[var(--text)] mb-3">Contrôle dimming</p>
                <div className="flex items-center gap-3 mb-3">
                  <input type="range" min={0} max={100} value={dimValue}
                    onChange={(e) => setDimValue(Number(e.target.value))}
                    className="flex-1 accent-brand-500" />
                  <span className="text-[14px] font-bold text-[var(--text)] w-12 text-right">{dimValue}%</span>
                </div>
                <Button size="sm" loading={dimming} onClick={handleDim} className="w-full">
                  Appliquer l'intensité
                </Button>
              </div>
            </div>
          )}

          {/* ── Contrôleur ── */}
          {!loading && tab === 'Contrôleur' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={14} className="text-brand-500" />
                  <p className="text-[13px] font-semibold text-[var(--text)]">Interface contrôleur</p>
                  {lamp.controller_type && (
                    <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                      {lamp.controller_type}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'UID Contrôleur',   value: lamp.controller_uid },
                    { label: 'Firmware',          value: lamp.controller_firmware },
                    { label: 'Qualité signal',    value: lamp.controller_signal_quality != null ? `${lamp.controller_signal_quality}%` : null },
                    { label: 'Dernière activité', value: lamp.controller_last_seen_at ? new Date(lamp.controller_last_seen_at).toLocaleString('fr-FR') : null },
                  ].map((row) => (
                    <div key={row.label} className="bg-[var(--surface-2)] rounded-lg p-3">
                      <p className="text-[11px] text-[var(--text-muted)]">{row.label}</p>
                      <p className="text-[13px] font-medium text-[var(--text)] mt-0.5 truncate">{row.value || '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-3 flex-wrap">
                  <div className={cn('flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg',
                    lamp.controller_status === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-[var(--text-muted)]')}>
                    {lamp.controller_status === 'ok' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {lamp.controller_status === 'ok' ? 'Communication OK' : `Statut: ${lamp.controller_status || 'inconnu'}`}
                  </div>
                  {lamp.dimming_enabled && (
                    <div className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500">
                      <Gauge size={12} /> Dimming actif
                    </div>
                  )}
                  {lamp.d4i_compatible && (
                    <div className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                      <Shield size={12} /> D4i
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-amber-400" />
                  <p className="text-[13px] font-semibold text-[var(--text)]">Driver électronique</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Marque',            value: lamp.driver_brand },
                    { label: 'Modèle',            value: lamp.driver_model },
                    { label: 'Protocole driver',  value: lamp.driver_protocol },
                    { label: 'Protocole dimming', value: lamp.dimming_protocol },
                    { label: 'Puissance nominale', value: lamp.nominal_power_w != null ? `${lamp.nominal_power_w} W` : null },
                    { label: 'Courant sortie',    value: lamp.output_current_ma != null ? `${lamp.output_current_ma.toFixed(0)} mA` : null },
                    { label: 'Tension sortie',    value: lamp.output_voltage_v != null ? `${lamp.output_voltage_v.toFixed(1)} V` : null },
                    { label: 'Facteur de puissance', value: lamp.power_factor != null ? lamp.power_factor.toFixed(2) : null },
                  ].map((row) => (
                    <div key={row.label} className="bg-[var(--surface-2)] rounded-lg p-3">
                      <p className="text-[11px] text-[var(--text-muted)]">{row.label}</p>
                      <p className="text-[13px] font-medium text-[var(--text)] mt-0.5">{row.value || '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-3 flex-wrap">
                  {lamp.surge_protection && (
                    <div className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Shield size={12} /> Protection surtension
                    </div>
                  )}
                  {lamp.metering_enabled && (
                    <div className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Activity size={12} /> Métrologie active
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer size={14} className="text-red-400" />
                  <p className="text-[13px] font-semibold text-[var(--text)]">Données opérationnelles</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Temp. driver',    value: lamp.driver_temperature     != null ? `${lamp.driver_temperature.toFixed(1)}°C`     : null },
                    { label: 'Temp. module LED', value: lamp.led_module_temperature != null ? `${lamp.led_module_temperature.toFixed(1)}°C` : null },
                    { label: 'Énergie cumulée', value: lamp.energy_kwh              != null ? `${lamp.energy_kwh.toFixed(2)} kWh`           : null },
                    { label: 'Heures de fonct.', value: lamp.operating_hours        != null ? `${Math.round(lamp.operating_hours)} h`        : null },
                  ].map((row) => (
                    <div key={row.label} className="bg-[var(--surface-2)] rounded-lg p-3">
                      <p className="text-[11px] text-[var(--text-muted)]">{row.label}</p>
                      <p className="text-[13px] font-medium text-[var(--text)] mt-0.5">{row.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {lamp.fault_status && lamp.fault_status !== 'none' ? (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={15} className="text-red-400 shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-red-400">Défaut détecté</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{lamp.fault_status}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle size={15} className="text-green-400 shrink-0" />
                  <p className="text-[12px] font-medium text-green-400">Aucun défaut détecté</p>
                </div>
              )}
            </div>
          )}

          {/* ── Télémétrie ── */}
          {!loading && tab === 'Télémétrie' && (
            <div className="space-y-5">
              <p className="text-[12px] text-[var(--text-muted)]">{telChartData.length} dernières mesures</p>
              {telChartData.length > 0 ? (
                <>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)] mb-3">Luminosité (%)</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={telChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="luminosite" stroke="#22c55e" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)] mb-3">Puissance (W)</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={telChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="puissance" stroke="#3b82f6" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="text-center text-[var(--text-muted)] py-8">Aucune donnée de télémétrie</p>
              )}
            </div>
          )}

          {/* ── Dimming ── */}
          {!loading && tab === 'Dimming' && (
            <div className="space-y-3">
              {dimHistory.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-8">Aucun historique</p>
              ) : dimHistory.map((cmd) => (
                <div key={cmd.id} className="bg-[var(--surface-2)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-[var(--text)]">
                      {cmd.old_intensity ?? '?'} → <span className="text-brand-500">{cmd.new_intensity}%</span>
                    </span>
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full',
                      cmd.status === 'applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      cmd.status === 'failed'  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400')}>
                      {cmd.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{cmd.reason} · {cmd.source} · {formatDate(cmd.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Décisions ── */}
          {!loading && tab === 'Décisions' && (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-8">Aucune décision enregistrée</p>
              ) : decisions.map((d, i) => (
                <div key={i} className="bg-[var(--surface-2)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-brand-500">{d.recommended_intensity}%</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{(d.confidence * 100).toFixed(0)}% confiance</span>
                  </div>
                  <p className="text-[12px] font-medium text-[var(--text)]">{d.rule_name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{d.reason}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatDate(d.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Éditer ── */}
          {tab === 'Éditer' && (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-[12px] text-[var(--text-muted)] pb-1">
                Modifiez les informations de configuration. Les données provenant du contrôleur (UID, firmware, driver) sont gérées par la synchronisation LCU.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Zone">
                  <input value={editForm.zone}
                    onChange={(e) => setEditForm((f) => ({ ...f, zone: e.target.value }))}
                    placeholder="ex: rabat"
                    className={inputCls} />
                </Field>
                <Field label="Puissance (W)">
                  <input type="number" min={0} value={editForm.puissance}
                    onChange={(e) => setEditForm((f) => ({ ...f, puissance: e.target.value }))}
                    placeholder="ex: 100"
                    className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Type de driver">
                  <div className="relative">
                    <select value={editForm.type_driver}
                      onChange={(e) => setEditForm((f) => ({ ...f, type_driver: e.target.value }))}
                      className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                      <option value="">— Sélectionner —</option>
                      {['DALI', '0-10V', 'PWM', 'ZigBee', 'LoRaWAN', 'Autre'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Protocole">
                  <div className="relative">
                    <select value={editForm.protocole}
                      onChange={(e) => setEditForm((f) => ({ ...f, protocole: e.target.value }))}
                      className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                      <option value="">— Sélectionner —</option>
                      {['ZigBee', 'LoRaWAN', 'DALI', '0-10V', 'Modbus', 'MQTT', 'Autre'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>

              <Field label="Adresse physique">
                <input value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="ex: 12 rue Mohammed V"
                  className={inputCls} />
              </Field>

              <Field label="Quartier">
                <input value={editForm.quartier}
                  onChange={(e) => setEditForm((f) => ({ ...f, quartier: e.target.value }))}
                  placeholder="ex: Centre-ville"
                  className={inputCls} />
              </Field>

              <Field label="Notes">
                <textarea rows={3} value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Remarques, interventions prévues…"
                  className={inputCls + ' resize-none'} />
              </Field>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setTab('Info')} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" loading={saving} className="flex-1">
                  <Save size={13} /> Enregistrer
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
