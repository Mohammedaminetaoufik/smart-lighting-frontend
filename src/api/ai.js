import axios from 'axios'

// Separate client with 60s timeout for AI calls (LLM inference can be slow)
// Also handles FastAPI's `detail` error field which the global client doesn't
const aiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

aiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message
    const error = new Error(msg)
    error.status = err.response?.status
    return Promise.reject(error)
  }
)

export const checkAIHealth = () =>
  aiClient.get('/ai/health', { timeout: 5000 })

export const askAI = (payload) =>
  aiClient.post('/ai/query', {
    question: payload.question,
    language: payload.language ?? 'fr',
    max_rows: payload.max_rows ?? 100,
    conversation_history: payload.conversation_history ?? null,
  })

export const getAISuggestions = () =>
  aiClient.get('/ai/suggestions')

/**
 * Streaming variant — calls /api/ai/query/stream and invokes callbacks per SSE event.
 * onMeta(meta)   — called once with {sql,columns,rows,summary,priority,confidence,chart,…}
 * onToken(token) — called for each chat_response token chunk
 * onDone()       — called when stream ends
 * onError(msg)   — called on error
 * Returns an AbortController so the caller can cancel.
 */
export function askAIStream(payload, { onMeta, onToken, onDone, onError }) {
  const controller = new AbortController()
  const run = async () => {
    try {
      const res = await fetch('/api/ai/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: payload.question,
          language: payload.language ?? 'fr',
          max_rows: payload.max_rows ?? 100,
          conversation_history: payload.conversation_history ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        onError?.(err.detail || `HTTP ${res.status}`)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') { onDone?.(); return }
          if (payload.startsWith('{')) {
            try {
              const parsed = JSON.parse(payload)
              if (parsed.type === 'meta') { onMeta?.(parsed); continue }
              if (parsed.type === 'error') { onError?.(parsed.message); return }
            } catch (_) { /* not JSON — treat as token */ }
          }
          onToken?.(payload)
        }
      }
      onDone?.()
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err.message)
    }
  }
  run()
  return controller
}

export const getDailyDigest = (refresh = false) =>
  aiClient.get('/ai/daily-digest', {
    params: refresh ? { refresh: 'true' } : {},
    timeout: 60000,
  })

export const getAIHistory = (limit = 20, search = '') =>
  aiClient.get('/ai/history', { params: { limit, search } })

export const getPageInsights = (page, refresh = false) =>
  aiClient.get(`/ai/page-insights/${page}`, {
    params: refresh ? { refresh: 'true' } : {},
    timeout: 60000,
  })

export const getEntityInsights = (entityType, entityId, refresh = false) =>
  aiClient.get(`/ai/entity-insights/${entityType}/${entityId}`, {
    params: refresh ? { refresh: 'true' } : {},
    timeout: 60000,
  })

export const getDecisionCenter = (refresh = false) =>
  aiClient.get('/ai/decision-center', {
    params: refresh ? { refresh: 'true' } : {},
    timeout: 30000,
  })
