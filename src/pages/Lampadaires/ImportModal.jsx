import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { importLampadaires } from '../../api/lampadaires'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { cn } from '../../utils/helpers'

const REQUIRED_COLS = ['reference']
const OPTIONAL_COLS = ['latitude', 'longitude', 'zone', 'puissance', 'etat', 'address', 'quartier']

const parseValue = (key, raw) => {
  const v = (raw ?? '').trim()
  if (v === '') return undefined
  if (key === 'latitude' || key === 'longitude') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  if (key === 'puissance') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : undefined
  }
  return v
}

export default function ImportModal({ open, onClose }) {
  const qc = useQueryClient()
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [missing, setMissing] = useState([])
  const [result, setResult] = useState(null)

  const reset = () => {
    setFile(null); setRows([]); setParseError(''); setMissing([]); setResult(null)
  }

  const close = () => { reset(); onClose() }

  const importMut = useMutation({
    mutationFn: importLampadaires,
    onSuccess: (res) => {
      setResult(res)
      const ok = (res?.created ?? 0) + (res?.updated ?? 0)
      toast.success(`${ok} lampadaire(s) importé(s)`)
      qc.invalidateQueries({ queryKey: ['lampadaires'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur import'),
  })

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setRows([])
    setParseError('')
    setResult(null)

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        if (res.errors.length > 0) {
          setParseError(res.errors[0].message)
          return
        }
        const headers = res.meta.fields || []
        const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c))
        setMissing(missingCols)
        if (missingCols.length > 0) {
          setParseError(`Colonnes manquantes: ${missingCols.join(', ')}`)
          return
        }
        // Map raw rows → typed rows
        const parsed = res.data.map((r) => {
          const out = {}
          for (const col of [...REQUIRED_COLS, ...OPTIONAL_COLS]) {
            const v = parseValue(col, r[col])
            if (v !== undefined) out[col] = v
          }
          return out
        }).filter((r) => r.reference)
        setRows(parsed)
      },
      error: (err) => setParseError(err.message),
    })
  }

  const submit = () => {
    if (rows.length === 0) return
    importMut.mutate(rows)
  }

  const preview = rows.slice(0, 5)

  return (
    <Modal open={open} onClose={close} title="Importer des lampadaires (CSV)" size="lg">
      <div className="space-y-4">
        {/* Step 1: file picker */}
        {!result && (
          <>
            <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center">
              <FileText size={28} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-[13px] font-medium text-[var(--text)] mb-1">
                Sélectionnez un fichier CSV
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Colonnes requises: <code className="font-mono">{REQUIRED_COLS.join(', ')}</code>
                <br />
                Colonnes optionnelles: <code className="font-mono">{OPTIONAL_COLS.join(', ')}</code>
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files[0])}
                className="text-[12px] text-[var(--text)] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-brand-500 file:text-white file:cursor-pointer file:hover:bg-brand-600 file:font-medium"
              />
              {file && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2 font-mono">{file.name}</p>
              )}
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-red-700 dark:text-red-400">{parseError}</p>
              </div>
            )}

            {/* Preview */}
            {rows.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-[var(--text)] mb-2">
                  Aperçu ({rows.length} lignes valides)
                </p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)] max-h-[300px]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[var(--surface-2)] sticky top-0">
                      <tr>
                        {[...REQUIRED_COLS, ...OPTIONAL_COLS].map((c) => (
                          <th key={c} className="px-2 py-1.5 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          {[...REQUIRED_COLS, ...OPTIONAL_COLS].map((c) => (
                            <td key={c} className="px-2 py-1 font-mono text-[var(--text)] truncate max-w-[120px]">
                              {r[c] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > preview.length && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center">
                    + {rows.length - preview.length} autres lignes
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 2: result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              <p className="text-[13px] text-green-700 dark:text-green-400 font-medium">
                Import terminé : {result.created} créés, {result.updated} mis à jour
              </p>
            </div>
            {result.errors?.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-2">
                  {result.errors.length} erreur(s)
                </p>
                <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i} className="font-mono">
                      Ligne {e.row}: {e.reference ? `${e.reference} — ` : ''}{e.error}
                    </li>
                  ))}
                  {result.errors.length > 50 && (
                    <li className="italic">+ {result.errors.length - 50} autres erreurs</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          {result ? (
            <Button onClick={close}>Fermer</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>Annuler</Button>
              <Button
                disabled={rows.length === 0}
                loading={importMut.isPending}
                onClick={submit}
              >
                <Upload size={13} /> Importer {rows.length > 0 && `(${rows.length})`}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
