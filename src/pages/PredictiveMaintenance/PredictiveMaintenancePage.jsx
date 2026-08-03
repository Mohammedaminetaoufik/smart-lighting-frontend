import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Database, AlertTriangle } from 'lucide-react'
import {
  getPredictiveSummary, getPredictions, getRiskTrend, filterPredictions,
  getPredictiveDistribution, summarizePredictions, distributePredictions, mergeDistribution, buildPredictionsCsv,
  createWorkOrderFromPrediction,
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
const EMPTY_PREDICTIONS = []

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

  const summaryQ = useQuery({ queryKey: ['pm-summary'], queryFn: getPredictiveSummary, refetchInterval: 60_000 })
  const predsQ   = useQuery({ queryKey: ['pm-predictions'], queryFn: getPredictions, refetchInterval: 60_000 })
  const trendFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch])
  const trendQ = useQuery({
    queryKey: ['pm-trend', trendFilters],
    queryFn: ({ signal }) => getRiskTrend(trendFilters, signal),
    staleTime: 60_000,
  })
  const distributionQ = useQuery({
    queryKey: ['pm-distribution', trendFilters],
    queryFn: ({ signal }) => getPredictiveDistribution(trendFilters, signal),
    staleTime: 60_000,
  })

  const predictions = predsQ.data ?? EMPTY_PREDICTIONS

  // Options de filtres dérivées des données réelles
  const zones = useMemo(() => [...new Set(predictions.map((p) => p.zone).filter(Boolean))].sort(), [predictions])
  const lcus  = useMemo(() => [...new Set(predictions.map((p) => p.lcu_reference).filter(Boolean))].sort(), [predictions])

  const filtered = useMemo(
    () => filterPredictions(predictions, { ...filters, search: debouncedSearch }),
    [predictions, filters, debouncedSearch],
  )
  const filteredSummary = useMemo(
    () => summarizePredictions(filtered, summaryQ.data),
    [filtered, summaryQ.data],
  )
  const filteredDistribution = useMemo(
    () => mergeDistribution(distributePredictions(filtered), distributionQ.data),
    [filtered, distributionQ.data],
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

  const handleAction = async (action, item) => {
    if (!item) return
    switch (action) {
      case 'diagnostic': setDrawerLampId(item.id); break
      case 'map':        navigate(`/map?focus=${item.id}`); break
      case 'telemetry':  navigate(`/lampadaires/${item.id}`); break
      case 'workorder': {
        try {
          const workOrder = await toast.promise(createWorkOrderFromPrediction(item), {
            loading: item.work_order_id ? 'Ouverture du bon de travail…' : 'Création du bon de travail…',
            success: (result) => result.existed ? 'Un bon de travail est déjà ouvert' : 'Bon de travail créé',
            error: (error) => error.message || 'Création impossible',
          })
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['pm-summary'] }),
            qc.invalidateQueries({ queryKey: ['pm-predictions'] }),
            qc.invalidateQueries({ queryKey: ['workorders'] }),
          ])
          navigate(`/workorders?focus=${workOrder.id}`)
        } catch {
          // toast.promise already exposes the actionable error.
        }
        break
      }
      case 'assign':
        if (item.work_order_id) navigate(`/workorders?focus=${item.work_order_id}`)
        else toast('Créez d’abord un bon de travail pour assigner un technicien.')
        break
      case 'verify': toast('La vérification doit être consignée dans un bon de travail.'); break
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
  const updateFilters = (updater) => {
    setFilters(updater)
    setSelected(new Set())
  }
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSelected(new Set())
  }

  if (summaryQ.isError && predsQ.isError) {
    return (
      <div className="space-y-5">
        <PredictiveMaintenanceHeader status="unavailable" onRefresh={handleRefresh} onExport={handleExport} />
        <PredictiveErrorState onRetry={handleRefresh} />
      </div>
    )
  }

  const s = filteredSummary

  return (
    <div className="space-y-5 pb-8">
      <PredictiveMaintenanceHeader
        status={modelStatus}
        lastUpdate={s?.generated_at}
        onRefresh={handleRefresh}
        onExport={handleExport}
        refreshing={summaryQ.isFetching || predsQ.isFetching}
      />

      <PredictiveFilters filters={filters} setFilters={updateFilters} zones={zones} lcus={lcus} onReset={resetFilters} />

      <PredictiveKpiGrid
        summary={s} distribution={filteredDistribution}
        trend={trendQ.data}
        loading={summaryQ.isLoading || predsQ.isLoading} error={summaryQ.isError || predsQ.isError}
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
            <span className="font-semibold text-[var(--text)]">{s.stale_telemetry_count}</span> avec données anciennes ou obsolètes
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
        <RiskTrendChart data={trendQ.data} loading={trendQ.isLoading} error={trendQ.isError} />
        <FailureCauseChart distribution={filteredDistribution} loading={predsQ.isLoading} error={predsQ.isError} />
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
        onAction={(action, item) => { void handleAction(action, item); if (action !== 'diagnostic') setDrawerLampId(null) }}
      />
    </div>
  )
}
