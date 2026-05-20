// CSV exports trigger a browser download via a hidden anchor.
// Backend already sets Content-Disposition headers.

const buildURL = (path, params) => {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== '')
    )
  ).toString()
  return `/api${path}${qs ? `?${qs}` : ''}`
}

const triggerDownload = (url) => {
  const a = document.createElement('a')
  a.href = url
  a.download = '' // hint browser to use Content-Disposition filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export const exportLampadaires = (filters) =>
  triggerDownload(buildURL('/export/lampadaires', filters))

export const exportAlerts = (filters) =>
  triggerDownload(buildURL('/export/alerts', filters))

export const exportWorkOrders = (filters) =>
  triggerDownload(buildURL('/export/workorders', filters))
