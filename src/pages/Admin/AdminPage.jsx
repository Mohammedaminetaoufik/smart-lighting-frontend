import { Link } from 'react-router-dom'
import { Server, Cpu, Radio, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { getCabinets, getBasestations, getControllers } from '../../api/infrastructure'
import { statusColor, labelStatus } from '../../utils/helpers'

export default function AdminPage() {
  const { data: basestations = [], isLoading: bsLoading } = useQuery({
    queryKey: ['basestations'],
    queryFn: getBasestations,
  })
  const { data: cabinets = [], isLoading: cabLoading } = useQuery({
    queryKey: ['cabinets'],
    queryFn: getCabinets,
  })
  const { data: controllers = [] } = useQuery({
    queryKey: ['controllers'],
    queryFn: getControllers,
  })

  if (bsLoading || cabLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-[var(--text)]">Infrastructure</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          {basestations.length} stations · {cabinets.length} armoires · {controllers.length} contrôleurs
        </p>
      </div>

      {/* Basestations */}
      <Card>
        <CardHeader title="Stations de base" subtitle={`${basestations.length} équipements de communication`} />
        {basestations.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune station configurée.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {basestations.map((bs) => {
              const c = statusColor(bs.status)
              return (
                <Link
                  key={bs.id}
                  to={`/basestations/${bs.id}`}
                  className="group bg-[var(--surface-2)] rounded-xl p-4 hover:bg-[var(--border)]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[13px] text-[var(--text)] flex items-center gap-1.5">
                      <Radio size={13} className="text-blue-500" />
                      {bs.reference}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge label={labelStatus(bs.status)} bg={c.bg} text={c.text} dot={c.dot} />
                      <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                    <p>Réseau : <span className="text-[var(--text)]">{bs.network_type || '—'}</span></p>
                    <p>Nœuds connectés : <span className="text-[var(--text)] font-medium">{bs.connected_nodes_count ?? 0}</span></p>
                    <p>Signal moyen : <span className="text-brand-500 font-medium">{bs.signal_quality_avg?.toFixed(0) ?? 0}%</span></p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      {/* Cabinets */}
      <Card>
        <CardHeader title="Armoires électriques" subtitle={`${cabinets.length} armoires de distribution`} />
        {cabinets.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune armoire configurée.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cabinets.map((cab) => {
              const c = statusColor(cab.status)
              const doorAlert = cab.door_status === 'open'
              const powerAlert = cab.power_status === 'failure'
              return (
                <Link
                  key={cab.id}
                  to={`/cabinets/${cab.id}`}
                  className="group bg-[var(--surface-2)] rounded-xl p-4 hover:bg-[var(--border)]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[13px] text-[var(--text)] flex items-center gap-1.5">
                      <Cpu size={13} className="text-amber-500" />
                      {cab.reference}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge label={labelStatus(cab.status)} bg={c.bg} text={c.text} dot={c.dot} />
                      <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                    <p>Porte : <span className={doorAlert ? 'text-amber-500 font-medium' : 'text-[var(--text)]'}>
                      {cab.door_status || '—'}
                    </span></p>
                    <p>Alimentation : <span className={powerAlert ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                      {cab.power_status || '—'}
                    </span></p>
                    <p>Énergie cumulée : <span className="text-[var(--text)] font-medium">
                      {cab.energy_kwh?.toFixed(1) ?? 0} kWh
                    </span></p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      {/* Controllers shortcut */}
      <Card>
        <CardHeader title="Contrôleurs" subtitle={`${controllers.length} équipements de pilotage`} />
        <Link
          to="/controllers"
          className="group bg-[var(--surface-2)] rounded-xl p-4 flex items-center justify-between hover:bg-[var(--border)]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Server size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text)]">Gérer les contrôleurs</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {controllers.filter((c) => !c.lampadaire_id).length} non associé(s)
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </Card>
    </div>
  )
}
