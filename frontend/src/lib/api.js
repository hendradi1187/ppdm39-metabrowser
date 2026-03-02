const BASE = '/api'

async function request(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin)
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  stats:     ()           => request('/stats'),
  tables:    (q)          => request('/tables', { q }),
  table:     (name)       => request('/table', { name }),
  erdData:   (name)       => request('/erd-data', { name }),
  loadOrder: ()           => request('/load-order'),
  audit:     ()           => request('/audit'),
  columns:   (q)          => request('/columns', { q }),
}
