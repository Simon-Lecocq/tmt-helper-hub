import { useState, useEffect, useCallback } from 'react'
import { consultantsAPI, assignationsAPI } from '../lib/api'
import { PageLoader, EmptyState } from '../components/LoadingSpinner'
import { useToast } from '../contexts/ToastContext'
import { getLevel } from './Dashboard'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function getLastMonths(n = 12) {
  const months = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}` })
  }
  return months
}

export default function Classement() {
  const toast = useToast()
  const [mode, setMode]           = useState('total')   // 'total' | 'mensuel'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [consultants, setConsultants] = useState([])
  const [assignations, setAssignations] = useState([])
  const [loading, setLoading]     = useState(true)

  const MONTHS = getLastMonths()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cons, ass] = await Promise.all([
        consultantsAPI.getAll(true),
        mode === 'mensuel'
          ? assignationsAPI.getAll(selectedMonth.month, selectedMonth.year)
          : assignationsAPI.getAll(),
      ])
      setConsultants(cons || [])
      setAssignations(ass || [])
    } catch (e) {
      toast.error('Erreur chargement : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [mode, selectedMonth.month, selectedMonth.year])

  useEffect(() => { loadData() }, [loadData])

  // ── Calcul du classement ───────────────────────────────────────────────
  const ranked = [...consultants]
    .filter((c) => c.statut === 'actif')
    .map((c) => {
      let points = c.total_points || 0
      if (mode === 'mensuel') {
        points = assignations
          .filter((a) => a.helper_id === c.id)
          .reduce((s, a) => s + (a.heures_creditees || 0), 0)
      }
      return { ...c, displayPoints: points }
    })
    .sort((a, b) => b.displayPoints - a.displayPoints)

  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  const totalPoints = ranked.reduce((s, c) => s + c.displayPoints, 0)
  const totalCompleted = mode === 'mensuel' ? assignations.length : undefined

  if (loading) return <PageLoader />

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">🏆 Classement des Helpers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            La reconnaissance, c'est important — merci à tous les helpers !
          </p>
        </div>
        {/* Sélecteur de mode */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode('total')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'total' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tout le temps
            </button>
            <button
              onClick={() => setMode('mensuel')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'mensuel' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Par mois
            </button>
          </div>
          {mode === 'mensuel' && (
            <select
              className="input text-sm w-44"
              value={`${selectedMonth.year}-${selectedMonth.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number)
                setSelectedMonth({ year: y, month: m })
              }}
            >
              {MONTHS.map(({ month, year, label }) => (
                <option key={`${year}-${month}`} value={`${year}-${month}`}>{label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Résumé rapide ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-gold-600">{totalPoints}</div>
          <div className="text-sm text-gray-500 mt-1">Points distribués</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-navy-900">{ranked.filter(c => c.displayPoints > 0).length}</div>
          <div className="text-sm text-gray-500 mt-1">Helpers actifs</div>
        </div>
        {mode === 'mensuel' && (
          <div className="card p-4 text-center col-span-2 sm:col-span-1">
            <div className="text-3xl font-bold text-emerald-600">{assignations.length}</div>
            <div className="text-sm text-gray-500 mt-1">Tâches complétées</div>
          </div>
        )}
      </div>

      {/* ── Podium Top 3 ───────────────────────────────────────────── */}
      {ranked.length > 0 && top3.some((c) => c.displayPoints > 0) && (
        <div>
          <h2 className="text-base font-semibold text-navy-900 mb-4">🥇 Podium</h2>
          <div className="flex items-end justify-center gap-4 sm:gap-8">
            {/* 2ème */}
            {top3[1] && (
              <PodiumCard rank={2} consultant={top3[1]} points={top3[1].displayPoints} height="h-32" />
            )}
            {/* 1er */}
            {top3[0] && (
              <PodiumCard rank={1} consultant={top3[0]} points={top3[0].displayPoints} height="h-44" />
            )}
            {/* 3ème */}
            {top3[2] && (
              <PodiumCard rank={3} consultant={top3[2]} points={top3[2].displayPoints} height="h-24" />
            )}
          </div>
        </div>
      )}

      {/* ── Tableau complet ────────────────────────────────────────── */}
      {ranked.length === 0 ? (
        <EmptyState
          icon="🏅"
          title="Aucun classement pour l'instant"
          description="Les points sont attribués lorsqu'une tâche est marquée comme complétée."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-navy-900">Classement général</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {ranked.map((c, i) => {
              const rank = i + 1
              const level = getLevel(c.displayPoints)
              const isTop3 = rank <= 3 && c.displayPoints > 0
              return (
                <div key={c.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                  rank === 1 && c.displayPoints > 0 ? 'bg-gold-50/50' : ''
                }`}>
                  {/* Rang */}
                  <div className={`w-8 text-center font-bold text-sm shrink-0 ${
                    rank === 1 ? 'text-gold-600' :
                    rank === 2 ? 'text-gray-500' :
                    rank === 3 ? 'text-amber-700' : 'text-gray-400'
                  }`}>
                    {isTop3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    rank === 1 && c.displayPoints > 0 ? 'bg-gold-500 text-navy-900' : 'bg-navy-100 text-navy-700'
                  }`}>
                    {c.nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{c.nom}</span>
                      {c.is_admin && <span className="badge bg-gold-100 text-gold-700 text-xs">Admin</span>}
                      {c.statut === 'inactif' && <span className="badge bg-gray-100 text-gray-500 text-xs">Inactif</span>}
                    </div>
                    <div className="text-xs text-gray-500">{c.grade}</div>
                  </div>

                  {/* Niveau */}
                  <div className="hidden sm:flex items-center">
                    <span className={`badge text-xs ${level.color}`}>
                      {level.emoji} {level.label}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold ${c.displayPoints > 0 ? 'text-gold-600' : 'text-gray-300'}`}>
                      {c.displayPoints}
                    </div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Légende des niveaux ─────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-navy-900 mb-3 text-sm">📊 Niveaux de helpers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { range: '0–9 pts',   ...getLevel(0) },
            { range: '10–24 pts', ...getLevel(10) },
            { range: '25–49 pts', ...getLevel(25) },
            { range: '50–99 pts', ...getLevel(50) },
            { range: '100+ pts',  ...getLevel(100) },
          ].map((l) => (
            <div key={l.label} className={`rounded-lg p-3 text-center ${l.color}`}>
              <div className="text-xl mb-1">{l.emoji}</div>
              <div className="font-semibold text-xs">{l.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{l.range}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function PodiumCard({ rank, consultant, points, height }) {
  const level = getLevel(points)
  const ini = consultant.nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = {
    1: 'bg-gold-500 text-navy-900',
    2: 'bg-gray-300 text-gray-800',
    3: 'bg-amber-700 text-white',
  }
  const podiumColors = {
    1: 'bg-gradient-to-b from-gold-400 to-gold-600 border-gold-400',
    2: 'bg-gradient-to-b from-gray-300 to-gray-400 border-gray-300',
    3: 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-600',
  }
  return (
    <div className="flex flex-col items-center gap-2 w-24 sm:w-32">
      {rank === 1 && <div className="text-2xl">👑</div>}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${colors[rank]}`}>
        {ini}
      </div>
      <div className="text-center">
        <div className="font-semibold text-xs text-gray-900 truncate max-w-full px-1">
          {consultant.nom.split(' ')[0]}
        </div>
        <div className="font-bold text-gold-600">{points} pts</div>
        <div className="text-xs text-gray-500">{level.emoji} {level.label}</div>
      </div>
      <div className={`w-full ${height} rounded-t-lg border-2 ${podiumColors[rank]} flex items-start justify-center pt-3`}>
        <span className="text-white/80 font-bold text-lg">{rank}</span>
      </div>
    </div>
  )
}
