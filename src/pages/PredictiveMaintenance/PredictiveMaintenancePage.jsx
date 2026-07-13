import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Database, AlertTriangle } from 'lucide-react'
import {
  getPredictiveSummary, getPredictions, getRiskTrend, getFaultDistribution,
  filterPredictions, buildPredictionsCsv,
} from '../../services/predictiveMaintenanceService'
import PredictiveMaintenanceHeader from '../../components/predictive-maintenance/PredictiveMaintenanceHeader'
import PredictiveFilters from '../../components/predictive-maintenance/PredictiveFilters'
import PredictiveKpiGrid from '../../components/predictive-maintenance/PredictiveKpiGrid'
import RiskTrendChart from '../../components/predictive-maintenance/RiskTrendChart'
import FailureCauseChart from '../../components/predictive-maintenance/FailureCauseChart'
import PriorityLampTable from '../../components/predictive-maintenance/PriorityLampTable'
import PredictionDetailsDrawer from '../../components/predictive-maintenance/PredictionDetailsDrawer'
import { PredictiveErrorState } from '../../components/predictive-maintenance/PredictiveStates'

const DEFAULT_FILTERS = {
  periodHours: 30 * 24, zone: 'all', lcu: 'all', riskLevel: 'all',
  faultType: 'all', online: 'all', freshness: 'all', search: '',
}

export default function PredictiveMaintenancePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [drawerLampId, setDrawerLampId] = useState(null)

  // Debounce de la recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 250)
    return () => clearTimeout(t)
  }, [filters.search])

  const days = Math.max(1, Math.round(filters.periodHours / 24))

  const summaryQ = useQuery({ queryKey: ['pm-summary'], queryFn: getPredictiveSummary, refetchInterval: 60_000 })
  const predsQ   = useQuery({ queryKey: ['pm-predictions'], queryFn: getPredictions, refetchInterval: 60_000 })
  const trendQ   = useQuery({ queryKey: ['pm-trend', days], queryFn: () => getRiskTrend(days), staleTime: 60_000 })
  const distQ    = useQuery({ queryKey: ['pm-distribution'], queryFn: getFaultDistribution, staleTime: 60_000 })

  const predictions = predsQ.data ?? []

  // Options de filtres dérivées des données réelles
  const zones = useMemo(() => [...new Set(predictions.map((p) => p.zone).filter(Boolean))].sort(), [predictions])
  const lcus  = useMemo(() => [...new Set(predictions.map((p) => p.lcu_reference).filter(Boolean))].sort(), [predictions])

  const filtered = useMemo(
    () => filterPredictions(predictions, { ...filters, search: debouncedSearch }),
    [predictions, filters, debouncedSearch],
  )

  const modelStatus = summaryQ.isError || predsQ.isError
    ? 'unavailable'
    : (summaryQ.data?.data_quality_score ?? 100) < 50 ? 'insufficient' : 'operational'

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['pm-summary'] })
    qc.invalidateQueries({ queryKey: ['pm-predictions'] })
    qc.invalidateQueries({ queryKey: ['pm-trend'] })
    qc.invalidateQueries({ queryKey: ['pm-distribution'] })
    toast.success('Prédictions actualisées')
  }

  const handleExport = () => {
    const csv = buildPredictionsCsv(filtered)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `maintenance-predictive-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAction = (action, item) => {
    if (!item) return
    switch (action) {
      case 'diagnostic': setDrawerLampId(item.id); break
      case 'map':        navigate(`/map?focus=${item.id}`); break
      case 'telemetry':  navigate(`/lampadaires?focus=${item.id}`); break
      case 'workorder':  navigate('/workorders'); toast('Créez le bon de travail depuis cette page.'); break
      case 'assign':     toast('Assignez un technicien depuis le bon de travail.'); break
      case 'verify':     toast.success(`${item.reference} marqué comme vérifié`); break
      default: break
    }
  }

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleAll = (pageItems) => setSelected((prev) => {
    const allSel = pageItems.every((i) => prev.has(i.id))
    const next = new Set(prev)
    pageItems.forEach((i) => (allSel ? next.delete(i.id) : next.add(i.id)))
    return next
  })
  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  if (summaryQ.isError && predsQ.isError) {
    return (
      <div className="space-y-5">
        <PredictiveMaintenanceHeader status="unavailable" onRefresh={handleRefresh} onExport={handleExport} />
        <PredictiveErrorState onRetry={handleRefresh} />
      </div>
    )
  }

  const s = summaryQ.data

  return (
    <div className="space-y-5 pb-8">
      <PredictiveMaintenanceHeader
        status={modelStatus}
        lastUpdate={s?.generated_at}
        onRefresh={handleRefresh}
        onExport={handleExport}
        refreshing={summaryQ.isFetching || predsQ.isFetching}
      />

      <PredictiveFilters filters={filters} setFilters={setFilters} zones={zones} lcus={lcus} onReset={resetFilters} />

      <PredictiveKpiGrid
        summary={s} distribution={distQ.data}
        loading={summaryQ.isLoading} error={summaryQ.isError}
      />

      {/* Qualité des données */}
      {s && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2 text-[12px]">
            <Database size={14} className="text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Qualité des données :</span>
            <span className="font-bold text-[var(--text)]">{s.data_quality_score}%</span>
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{s.missing_telemetry_count}</span> sans données
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{s.stale_telemetry_count}</span> avec données obsolètes
          </span>
          {s.data_quality_score < 70 && (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={12} /> Fiabilité réduite : plusieurs prédictions reposent sur des données anciennes.
            </span>
          )}
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RiskTrendChart data={trendQ.data} />
        <FailureCauseChart distribution={distQ.data} />
      </div>

      {/* Tableau prioritaire */}
      <PriorityLampTable
        items={filtered}
        loading={predsQ.isLoading}
        error={predsQ.isError}
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onRowClick={(p) => setDrawerLampId(p.id)}
        onAction={handleAction}
      />

      {/* Drawer diagnostic */}
      <PredictionDetailsDrawer
        lampId={drawerLampId}
        onClose={() => setDrawerLampId(null)}
        onAction={(action, item) => { handleAction(action, item); if (action !== 'diagnostic') setDrawerLampId(null) }}
      />
    </div>
  )
}
