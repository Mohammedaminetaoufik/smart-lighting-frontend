// Génère un rapport d'audit énergétique PDF pour la direction.
// Import différé de jsPDF/autoTable pour ne pas alourdir le bundle initial.

function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export async function generateEnergyAuditPdf({
  period,
  bill,
  summary,
  topConsumers = [],
  costDH,
  savDH,
  co2Kg,
  avgDim,
  measuredShare,
  aiInsight, // { summary, analysis, recommendations } | null
}) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = new Date().toLocaleString('fr-FR')
  let y = 48

  // ── En-tête ──
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 76, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('Rapport d\'audit énergétique', 40, 40)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Lamalif Télégestion · Période : ${period} · Généré le ${now}`, 40, 58)
  y = 104

  // ── Synthèse chiffrée ──
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('1. Synthèse financière', 40, y); y += 10

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Coût énergie (réel, tarification ONEE)', `${fmt(costDH)} DH`],
      ['Économies estimées (dimming)', `${fmt(savDH)} DH`],
      ['CO₂ évité', `${fmt(co2Kg)} kg`],
      ['Intensité moyenne (dimming actif)', `${fmt(avgDim)} %`],
      ['Part de consommation mesurée', measuredShare != null ? `${fmt(measuredShare * 100)} %` : '—'],
    ],
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: 40, right: 40 },
  })
  y = doc.lastAutoTable.finalY + 24

  // ── Facture par poste ONEE ──
  if (bill?.lines?.length) {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('2. Facture par poste horaire (ONEE)', 40, y); y += 10
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Poste', 'kWh', 'Prix DH/kWh', 'Coût DH']],
      body: bill.lines.map((l) => [l.label, fmt(l.kwh, 1), fmt(l.price_dh_per_kwh, 2), fmt(l.cost_dh)]),
      foot: [['Total', fmt(bill.total_kwh, 1), '', `${fmt(bill.total_cost_dh)} DH`]],
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // ── Top consommateurs ──
  if (topConsumers.length) {
    if (y > 640) { doc.addPage(); y = 48 }
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('3. Principaux consommateurs', 40, y); y += 10
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      head: [['Référence', 'Zone', 'kWh', 'Dimming %']],
      body: topConsumers.slice(0, 10).map((c) => [
        c.reference ?? '—', c.zone ?? '—', fmt(c.kwh ?? c.KWh, 1), fmt(c.avg_dim_pct ?? c.AvgDimPct, 0),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  // ── Analyse & recommandations IA ──
  if (aiInsight && (aiInsight.analysis || aiInsight.recommendations?.length)) {
    if (y > 620) { doc.addPage(); y = 48 }
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('4. Analyse & recommandations IA', 40, y); y += 18
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')

    if (aiInsight.analysis) {
      const lines = doc.splitTextToSize(aiInsight.analysis, pageW - 80)
      doc.text(lines, 40, y); y += lines.length * 13 + 8
    }
    if (aiInsight.recommendations?.length) {
      doc.setFont('helvetica', 'bold'); doc.text('Recommandations :', 40, y); y += 15
      doc.setFont('helvetica', 'normal')
      aiInsight.recommendations.forEach((r) => {
        const lines = doc.splitTextToSize(`• ${r}`, pageW - 90)
        if (y > 780) { doc.addPage(); y = 48 }
        doc.text(lines, 48, y); y += lines.length * 13 + 4
      })
    }
  }

  // ── Pied de page : mention estimation ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text(
      'Les économies et le CO₂ sont des estimations (dimming linéaire). Tarifs et facteur CO₂ configurables (contrat ONEE).',
      40, doc.internal.pageSize.getHeight() - 24,
    )
    doc.text(`Page ${i}/${pageCount}`, pageW - 70, doc.internal.pageSize.getHeight() - 24)
  }

  doc.save(`audit-energetique-${new Date().toISOString().slice(0, 10)}.pdf`)
}
