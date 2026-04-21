// ── Helpers ──────────────────────────────────────────────────────────────────
const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`)
  return json
}

// ── Consultants ───────────────────────────────────────────────────────────────
export const consultantsAPI = {
  getAll: (includeInactive = false) =>
    req(`/consultants?includeInactive=${includeInactive}`),
  create: (data) => req('/consultants', { method: 'POST', body: data }),
  update: (id, data) => req(`/consultants?id=${id}`, { method: 'PUT', body: data }),
  delete: (id) => req(`/consultants?id=${id}`, { method: 'DELETE' }),
}

// ── Demandes ──────────────────────────────────────────────────────────────────
export const demandesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    ).toString()
    return req(`/demandes${params ? '?' + params : ''}`)
  },
  create: (data) => req('/demandes', { method: 'POST', body: data }),
  accept: (id, helper_id) =>
    req(`/demandes?id=${id}&action=accept`, { method: 'PUT', body: { helper_id } }),
  refuse: (id, data) =>
    req(`/demandes?id=${id}&action=refuse`, { method: 'PUT', body: data }),
  assign: (id, helper_id) =>
    req(`/demandes?id=${id}&action=assign`, { method: 'PUT', body: { helper_id } }),
  complete: (id, heures_creditees) =>
    req(`/demandes?id=${id}&action=complete`, { method: 'PUT', body: { heures_creditees } }),
}

// ── Disponibilités ────────────────────────────────────────────────────────────
export const disponibilitesAPI = {
  getAll: () => req('/disponibilites'),
  create: (data) => req('/disponibilites', { method: 'POST', body: data }),
  deactivate: (id) => req(`/disponibilites?id=${id}`, { method: 'PUT', body: { est_active: false } }),
}

// ── Assignations ──────────────────────────────────────────────────────────────
export const assignationsAPI = {
  getAll: (month, year) => {
    const params = month && year ? `?month=${month}&year=${year}` : ''
    return req(`/assignations${params}`)
  },
}
