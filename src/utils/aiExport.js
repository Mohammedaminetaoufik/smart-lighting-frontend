import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Helpers ──────────────────────────────────────────────────────────────────

export function sanitizeFilename(text) {
  return String(text)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]|[-_]$/g, '')
    .slice(0, 80)
}

function getTimestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
}

export function formatValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  return String(value)
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function exportAIResultToCSV(result) {
  if (!result?.columns?.length || !result?.rows?.length) {
    throw new Error('Aucune donnée à exporter.')
  }

  const orderedRows = result.rows.map((row) => {
    const out = {}
    result.columns.forEach((col) => { out[col] = row[col] ?? '' })
    return out
  })

  const csv = Papa.unparse(orderedRows, { columns: result.columns })
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(`ai_result_${getTimestamp()}.csv`, blob)
}

// ── PDF export ────────────────────────────────────────────────────────────────

const C_BRAND  = [34, 197, 94]
const C_DARK   = [15, 23, 42]
const C_MUTED  = [100, 116, 139]
const C_BORDER = [226, 232, 240]
const C_BG     = [241, 245, 249]

const PRIORITY_COLORS_PDF = {
  low:      [100, 116, 139],
  medium:   [245, 158,  11],
  high:     [249, 115,  22],
  critical: [239,  68,  68],
}
const PRIORITY_LABELS_PDF = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' }

export async function exportAIResultToPDF(result, chartElementRef = null) {
  if (!result) throw new Error('Aucun résultat à exporter.')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 14           // left/right margin
  const cW = pageW - M * 2  // content width
  let y = M

  // ── Helpers ────────────────────────────────────────────────────────
  const checkPage = (needed = 30) => {
    if (y + needed > pageH - 16) { doc.addPage(); y = M }
  }

  const addDivider = () => {
    doc.setDrawColor(...C_BORDER)
    doc.line(M, y, pageW - M, y)
    y += 5
  }

  const addSectionLabel = (label) => {
    checkPage(12)
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...C_MUTED)
    doc.text(label.toUpperCase(), M, y)
    y += 5
  }

  const addBodyText = (text, color = C_DARK) => {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text || '—', cW)
    checkPage(lines.length * 5 + 4)
    doc.text(lines, M, y)
    y += lines.length * 5 + 5
  }

  const addSection = (label, text, color = C_DARK) => {
    addSectionLabel(label)
    addBodyText(text, color)
  }

  // ── Green header banner ─────────────────────────────────────────────
  doc.setFillColor(...C_BRAND)
  doc.rect(0, 0, pageW, 20, 'F')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.setFont(undefined, 'bold')
  doc.text('Rapport Assistant IA — Lamalif Télégestion', M, 13)
  y = 28

  // ── Meta line ───────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  doc.setFontSize(8.5)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(...C_MUTED)
  doc.text(`Généré le : ${dateStr}`, M, y)
  doc.text(`${result.rows?.length ?? 0} résultat(s)`, M + 90, y)
  if (result.execution_time_ms) {
    doc.text(`Durée : ${result.execution_time_ms} ms`, M + 140, y)
  }
  y += 6

  // ── Priority ────────────────────────────────────────────────────────
  if (result.priority) {
    const pcol = PRIORITY_COLORS_PDF[result.priority] ?? PRIORITY_COLORS_PDF.medium
    doc.setFontSize(8.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...C_MUTED)
    doc.text('Priorité :', M, y)
    doc.setTextColor(...pcol)
    doc.text((PRIORITY_LABELS_PDF[result.priority] ?? result.priority).toUpperCase(), M + 18, y)
    y += 6
  }

  addDivider()

  // ── Question ────────────────────────────────────────────────────────
  addSection('Question posée', result.question)
  addDivider()

  // ── Analysis sections ────────────────────────────────────────────────
  addSection('Résumé', result.summary)
  if (result.analysis) addSection('Analyse professionnelle', result.analysis)
  addSection('Recommandation', result.recommendation)
  addDivider()

  // ── Chart capture (optional) ─────────────────────────────────────────
  if (chartElementRef?.current) {
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartElementRef.current, {
        backgroundColor: '#1a1d27',
        scale: 1.5,
        logging: false,
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')
      const imgH = (canvas.height * cW) / canvas.width
      checkPage(imgH + 15)
      addSectionLabel('Visualisation')
      doc.addImage(imgData, 'PNG', M, y, cW, imgH)
      y += imgH + 8
      addDivider()
    } catch {
      addSection('Visualisation', 'Visualisation disponible dans l\'interface web.')
      addDivider()
    }
  }

  // ── SQL block ────────────────────────────────────────────────────────
  checkPage(20)
  addSectionLabel('SQL généré')
  const sqlLines = doc.splitTextToSize(result.sql || '', cW - 6)
  const sqlBoxH = sqlLines.length * 4.5 + 8
  checkPage(sqlBoxH + 4)
  doc.setFillColor(...C_BG)
  doc.setDrawColor(...C_BORDER)
  doc.roundedRect(M, y, cW, sqlBoxH, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setFont('courier', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(sqlLines, M + 3, y + 5)
  y += sqlBoxH + 8
  doc.setFont(undefined, 'normal')
  addDivider()

  // ── Data table ────────────────────────────────────────────────────────
  if (result.rows?.length > 0 && result.columns?.length > 0) {
    const MAX_ROWS = 200
    const sliced = result.rows.slice(0, MAX_ROWS)

    checkPage(20)
    addSectionLabel(
      `Résultats — ${sliced.length}${result.rows.length > MAX_ROWS ? `/${result.rows.length} (limité à ${MAX_ROWS} lignes dans le PDF)` : ''} ligne(s)`,
    )

    const head = [result.columns]
    const body = sliced.map((row) =>
      result.columns.map((col) => {
        const v = formatValue(row[col])
        return v.length > 42 ? v.slice(0, 40) + '…' : v
      }),
    )

    autoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: M, right: M },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: C_DARK,
        lineColor: C_BORDER,
        lineWidth: 0.25,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: C_BRAND,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: C_BG },
      tableLineColor: C_BORDER,
      tableLineWidth: 0.25,
    })
  }

  // ── Footer on every page ─────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(...C_MUTED)
    doc.setFont(undefined, 'normal')
    doc.text('Lamalif Télégestion — Document confidentiel', M, pageH - 7)
    doc.text(`Page ${i} / ${total}`, pageW - M, pageH - 7, { align: 'right' })
    // thin footer line
    doc.setDrawColor(...C_BORDER)
    doc.line(M, pageH - 11, pageW - M, pageH - 11)
  }

  doc.save(`rapport_ai_lamalif_${getTimestamp()}.pdf`)
}
