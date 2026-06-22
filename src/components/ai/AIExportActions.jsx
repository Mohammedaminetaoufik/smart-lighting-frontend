import { useState } from 'react'
import { Download, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { exportAIResultToCSV, exportAIResultToPDF } from '../../utils/aiExport'
import { cn } from '../../utils/helpers'

const STATUS_DURATION = 3500

export default function AIExportActions({ result, chartRef }) {
  const [csvStatus, setCsvStatus] = useState('idle')   // idle | success | error
  const [pdfStatus, setPdfStatus] = useState('idle')   // idle | loading | success | error
  const [csvMsg,    setCsvMsg]    = useState('')
  const [pdfMsg,    setPdfMsg]    = useState('')

  const hasData = result?.rows?.length > 0

  const flash = (setStatus, setMsg, status, msg) => {
    setStatus(status)
    setMsg(msg)
    setTimeout(() => { setStatus('idle'); setMsg('') }, STATUS_DURATION)
  }

  const handleCSV = () => {
    try {
      exportAIResultToCSV(result)
      flash(setCsvStatus, setCsvMsg, 'success', 'Export CSV généré')
    } catch (err) {
      flash(setCsvStatus, setCsvMsg, 'error', err.message || 'Erreur lors de l\'export CSV')
    }
  }

  const handlePDF = async () => {
    setPdfStatus('loading')
    setPdfMsg('')
    try {
      await exportAIResultToPDF(result, chartRef)
      flash(setPdfStatus, setPdfMsg, 'success', 'Rapport PDF généré')
    } catch (err) {
      flash(setPdfStatus, setPdfMsg, 'error', err.message || 'Erreur lors de la génération PDF')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* ── CSV button ── */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleCSV}
          disabled={!hasData}
          title={!hasData ? 'Aucune donnée à exporter' : 'Télécharger les résultats en CSV'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none',
            !hasData
              ? 'opacity-40 cursor-not-allowed bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]'
              : csvStatus === 'success'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : csvStatus === 'error'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:bg-brand-500/5 hover:text-[var(--text)] hover:border-brand-500/30',
          )}
        >
          {csvStatus === 'success' ? <CheckCircle2 size={12} /> :
           csvStatus === 'error'   ? <AlertCircle  size={12} /> :
                                     <Download     size={12} />}
          {csvStatus === 'success' ? 'CSV exporté' :
           csvStatus === 'error'   ? 'Erreur' : 'CSV'}
        </button>
        {csvMsg && (
          <span className={cn(
            'text-[10px] hidden sm:block transition-opacity',
            csvStatus === 'error' ? 'text-red-400' : 'text-green-400',
          )}>
            {csvMsg}
          </span>
        )}
      </div>

      {/* ── PDF button ── */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePDF}
          disabled={!result || pdfStatus === 'loading'}
          title="Télécharger le rapport PDF complet"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none',
            !result
              ? 'opacity-40 cursor-not-allowed bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]'
              : pdfStatus === 'loading'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-wait'
                : pdfStatus === 'success'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : pdfStatus === 'error'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:bg-blue-500/5 hover:text-[var(--text)] hover:border-blue-500/30',
          )}
        >
          {pdfStatus === 'loading'  ? <Loader2     size={12} className="animate-spin" /> :
           pdfStatus === 'success'  ? <CheckCircle2 size={12} /> :
           pdfStatus === 'error'    ? <AlertCircle  size={12} /> :
                                      <FileText     size={12} />}
          {pdfStatus === 'loading'  ? 'PDF…' :
           pdfStatus === 'success'  ? 'PDF exporté' :
           pdfStatus === 'error'    ? 'Erreur' : 'PDF'}
        </button>
        {pdfMsg && pdfStatus !== 'loading' && (
          <span className={cn(
            'text-[10px] hidden sm:block transition-opacity',
            pdfStatus === 'error' ? 'text-red-400' : 'text-green-400',
          )}>
            {pdfMsg}
          </span>
        )}
      </div>

    </div>
  )
}
