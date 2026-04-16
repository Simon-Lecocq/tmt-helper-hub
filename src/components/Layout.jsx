import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Modal from './Modal'
import { consultantsAPI } from '../lib/api'

const NAV_ITEMS = [
  { to: '/',           label: 'Tableau de bord', icon: '🏠' },
  { to: '/demandes',   label: 'Demandes',        icon: '📋' },
  { to: '/classement', label: 'Classement',      icon: '🏆' },
  { to: '/admin',      label: 'Équipe',          icon: '👥' },
]

const STORAGE_KEY = 'tmthh_current_consultant_id'

export default function Layout({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [consultants, setConsultants] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Fermer le menu mobile à chaque changement de route
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    loadConsultants()
  }, [])

  async function loadConsultants() {
    try {
      const data = await consultantsAPI.getAll()
      setConsultants(data || [])
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const found = (data || []).find((c) => c.id === savedId)
        if (found) setCurrentUser(found)
        else setShowPicker(true)
      } else {
        setShowPicker(true)
      }
    } catch {
      // Pas de connexion Supabase – afficher quand même l'UI
    }
  }

  function selectUser(consultant) {
    setCurrentUser(consultant)
    localStorage.setItem(STORAGE_KEY, consultant.id)
    setShowPicker(false)
  }

  const initials = currentUser
    ? currentUser.nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="bg-navy-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 bg-gold-500 rounded-lg flex items-center justify-center font-bold text-navy-900 text-sm">
                TMT
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-base leading-tight tracking-wide">TMT Helper Hub</div>
                <div className="text-navy-300 text-xs">BearingPoint</div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-navy-200 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User selector */}
            <div className="flex items-center gap-3">
              {currentUser ? (
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg"
                >
                  <div className="w-7 h-7 rounded-full bg-gold-500 text-navy-900 flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs text-navy-200 leading-none">Connecté·e</div>
                    <div className="text-sm font-medium text-white leading-tight">{currentUser.nom}</div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-sm text-gold-400 hover:text-gold-300 font-medium"
                >
                  Qui suis-je ?
                </button>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-navy-800 bg-navy-950 px-4 pb-3">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-navy-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        TMT Helper Hub · BearingPoint · {new Date().getFullYear()}
      </footer>

      {/* ── Modal "Qui êtes-vous ?" ────────────────────────────────────── */}
      <Modal
        isOpen={showPicker}
        onClose={() => currentUser && setShowPicker(false)}
        title="Qui êtes-vous ?"
        size="sm"
      >
        {consultants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-600 text-sm">
              Aucun consultant trouvé. Commencez par configurer votre base de données
              et ajouter des membres dans l'onglet <strong>Équipe</strong>.
            </p>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-4 btn-primary"
            >
              Continuer en tant qu'invité
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez votre nom pour identifier vos actions dans l'application.
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {consultants.map((c) => {
                const ini = c.nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <button
                    key={c.id}
                    onClick={() => selectUser(c)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                      ${currentUser?.id === c.id
                        ? 'border-navy-700 bg-navy-50'
                        : 'border-gray-100 hover:border-navy-200 hover:bg-gray-50'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                      ${currentUser?.id === c.id ? 'bg-navy-900 text-gold-400' : 'bg-navy-100 text-navy-700'}
                    `}>
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{c.nom}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        {c.grade}
                        {c.is_admin && (
                          <span className="ml-1 badge bg-gold-100 text-gold-700">Admin</span>
                        )}
                      </div>
                    </div>
                    {currentUser?.id === c.id && (
                      <span className="text-navy-700 text-sm">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// Hook pour accéder à l'utilisateur courant depuis n'importe quel composant
export function useCurrentUser() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY)
    if (!id) return
    consultantsAPI.getAll().then((data) => {
      const found = (data || []).find((c) => c.id === id)
      if (found) setUser(found)
    }).catch(() => {})
  }, [])
  return user
}
