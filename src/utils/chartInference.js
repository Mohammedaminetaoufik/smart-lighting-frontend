// ── Primitive detectors ──────────────────────────────────────────────────────

export function isNumericValue(value) {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'number') return !isNaN(value)
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.')
    return cleaned !== '' && !isNaN(Number(cleaned))
  }
  return false
}

export function isDateLikeValue(value) {
  if (value === null || value === undefined) return false
  const s = String(value)
  // ISO date / datetime patterns
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)
}

// ── Column classifiers ───────────────────────────────────────────────────────

export function getNumericColumns(columns, rows) {
  if (!columns?.length || !rows?.length) return []
  return columns.filter((col) => {
    const values = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined)
    if (!values.length) return false
    const numericCount = values.filter(isNumericValue).length
    return numericCount / values.length >= 0.8
  })
}

export function getDateColumns(columns, rows) {
  if (!columns?.length || !rows?.length) return []
  return columns.filter((col) => {
    const values = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined)
    if (!values.length) return false
    const dateCount = values.filter(isDateLikeValue).length
    return dateCount / values.length >= 0.7
  })
}

export function getTextColumns(columns, rows) {
  if (!columns?.length || !rows?.length) return []
  const numeric = new Set(getNumericColumns(columns, rows))
  const dates = new Set(getDateColumns(columns, rows))
  return columns.filter((col) => !numeric.has(col) && !dates.has(col))
}

// ── Pie/distribution intent ──────────────────────────────────────────────────

const PIE_KEYWORDS = ['répartition', 'distribution', 'part ', 'pourcentage', 'proportion', 'breakdown']

export function questionSuggestsPie(question) {
  if (!question) return false
  const lower = question.toLowerCase()
  return PIE_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── Main inference ───────────────────────────────────────────────────────────

/**
 * Returns a config object:
 * { type: 'bar'|'line'|'pie'|'kpi'|'none', xKey, yKey, yKeys }
 */
export function inferChartConfig(columns, rows, chart, question) {
  if (!columns?.length || !rows?.length) return { type: 'none' }

  const numCols  = getNumericColumns(columns, rows)
  const dateCols = getDateColumns(columns, rows)
  const textCols = getTextColumns(columns, rows)

  // 1. Single row with multiple numeric columns → KPI cards
  if (rows.length === 1 && numCols.length >= 1) {
    return { type: 'kpi', yKeys: numCols }
  }

  // 2. Date column + numeric column → LineChart
  if (dateCols.length >= 1 && numCols.length >= 1) {
    return { type: 'line', xKey: dateCols[0], yKey: numCols[0] }
  }

  // 3. Text column + numeric column
  if (textCols.length >= 1 && numCols.length >= 1) {
    const xKey = textCols[0]
    const yKey = numCols[0]

    // Pie: only if ≤8 rows and question suggests distribution
    if (rows.length <= 8 && questionSuggestsPie(question)) {
      return { type: 'pie', xKey, yKey }
    }

    return { type: 'bar', xKey, yKey }
  }

  // 4. Only numeric columns, multiple rows → bar with index
  if (numCols.length >= 2 && rows.length > 1) {
    return { type: 'bar', xKey: columns[0], yKey: numCols[0] }
  }

  return { type: 'none' }
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatChartValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString('fr-FR')
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  }
  if (typeof value === 'string' && isNumericValue(value)) {
    const n = parseFloat(value.replace(',', '.'))
    return Number.isInteger(n) ? n.toLocaleString('fr-FR') : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  }
  return String(value)
}

export function truncateLabel(label, maxLength = 18) {
  if (label === null || label === undefined) return '—'
  const s = String(label)
  return s.length > maxLength ? s.slice(0, maxLength - 1) + '…' : s
}

export function formatAxisLabel(label) {
  return truncateLabel(label, 18)
}
