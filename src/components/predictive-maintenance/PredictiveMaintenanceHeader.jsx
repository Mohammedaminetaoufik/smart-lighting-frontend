import { RefreshCw, FileDown, CircleCheck, CircleAlert, CircleSlash, Info } from 'lucide-react'

const MODEL_STATUS = {
  operational: { label: 'Modèle opérationnel',  color: '#22c55e', icon: CircleCheck },
  insufficient: { label: 'Données insuffisantes', color: '#f59e0b', icon: CircleAlert },
  unavailable: { label: 'Modèle indisponible',  color: '#ef4444', icon: CircleSlash },
}

export default function PredictiveMaintenanceHeader({ status = 'operational', lastUpdate, onRefresh, onExport, refreshing }) {
  const st = MODEL_STATUS[status] ?? MODEL_STATUS.operational
  const StIcon = st.icon
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)]">Maintenance prédictive</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5 max-w-2xl">
            Anticipation des défaillances à partir de la télémétrie électrique, thermique et opérationnelle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border"
            style={{ color: st.color, background: `${st.color}12`, borderColor: `${st.color}30` }}
            role="status" aria-label={`État du modèle : ${st.label}`}>
            <StIcon size={13} /> {st.label}
          </span>
          <button onClick={onRefresh} disabled={refreshing}
            aria-label="Actualiser les prédictions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button onClick={onExport}
            aria-label="Exporter le rapport CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20 transition-colors">
            <FileDown size={13} /> Exporter le rapport
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[var(--text-muted)]">
        {lastUpdate && <span>Dernière mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}</span>}
        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Info size={12} />
          Les recommandations générées doivent être validées par un responsable avant toute intervention.
        </span>
      </div>
    </div>
  )
}
