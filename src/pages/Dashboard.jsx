import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../components/Layout'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'
import { PageLoader, EmptyState } from '../components/LoadingSpinner'
import { consultantsAPI, demandesAPI, disponibilitesAPI } from '../lib/api'

const CATEGORIES = [
  'Slides / Présentation',
  'Recherche & Benchmark',
  'Analyse de données',
  'Support projet',
  'Projet interne',
  'Autre',
]

const today = new Date().toISOString().split('T')[0]

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long',
  })
}

export default function Dashboard() {
  const currentUser = useCurrentUser()
  const toast = useToast()

  const [demandes,       setDemandes]       = useState([])
  const [disponibilites, setDisponibilites] = useState([])
  const [consultants,    setConsultants]    = useState([])
  const [loading,        setLoading]        = useState(true)

  const [showDemModal,   setShowDemModal]   = useState(false)
  const [showDispoModal, setShowDispoModal] = useState(false)

  // ── Formulaire demande ───────────────────────────────────────────────
  const [demForm, setDemForm] = useState({
    titre: '', categorie: '', description: '', heures_estimees: 2,
    demandeur_id: '', consultants_notifies: [],
  })
  const [demLoading, setDemLoading] = useState(false)

  // ── Formulaire disponibilité ─────────────────────────────────────────
  const [dispoForm, setDispoForm] = useState({
    date_debut: today,
    date_fin:   '',
    heures_par_jour: 4,
    note: '',
  })
  const [dispoLoading, setDispoLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dem, dispo, cons] = await Promise.all([
        demandesAPI.getAll({ statut: 'ouverte' }),
        disponibilitesAPI.getAll(),
        consultantsAPI.getAll(),
      ])
      setDemandes(dem || [])
      setDisponibilites(dispo || [])
      setConsultants(cons || [])
    } catch (e) {
      toast.error('Impossible de charger les données : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (currentUser) setDemForm((f) => ({ ...f, demandeur_id: currentUser.id }))
  }, [currentUser])

  // ── Stats ────────────────────────────────────────────────────────────
  const openCount   = demandes.length
  const helperCount = disponibilites.length

  // ── Surchargés ───────────────────────────────────────────────────────
  const surchargesMap = {}
  demandes.forEach((d) => {
    if (!d.demandeur) return
    const cid = d.demandeur.id
    if (!surchargesMap[cid]) surchargesMap[cid] = { consultant: d.demandeur, demandes: [] }
    surchargesMap[cid].demandes.push(d)
  })
  const surcharges    = Object.values(surchargesMap)
  const surchargesIds = new Set(surcharges.map((s) => s.consultant.id))

  // ── Actions ──────────────────────────────────────────────────────────
  async function submitDemande(e) {
    e.preventDefault()
    if (!demForm.demandeur_id) return toast.error('Sélectionnez le demandeur.')
    if (!demForm.titre)        return toast.error('Le titre est obligatoire.')
    if (!demForm.categorie)    return toast.error('La catégorie est obligatoire.')
    setDemLoading(true)
    try {
      await demandesAPI.create(demForm)
      toast.success('Demande postée ! Notifications envoyées.')
      setShowDemModal(false)
      setDemForm({ titre: '', categorie: '', description: '', heures_estimees: 2, demandeur_id: currentUser?.id || '', consultants_notifies: [] })
      loadData()
    } catch (e) {
      toast.error('Erreur : ' + e.message)
    } finally {
      setDemLoading(false)
    }
  }

  async function submitDispo(e) {
    e.preventDefault()
    if (!currentUser) return toast.error("Sélectionnez votre profil dans l'en-tête.")
    if (!dispoForm.date_fin) return toast.error('La date de fin est obligatoire.')
    if (dispoForm.date_fin < dispoForm.date_debut) return toast.error('La date de fin doit être après la date de début.')
    setDispoLoading(true)
    try {
      await disponibilitesAPI.create({ consultant_id: currentUser.id, ...dispoForm })
      toast.success('Disponibilité enregistrée ! Vos collègues peuvent vous contacter.')
      setShowDispoModal(false)
      setDispoForm({ date_debut: today, date_fin: '', heures_par_jour: 4, note: '' })
      loadData()
    } catch (e) {
      toast.error('Erreur : ' + e.message)
    } finally {
      setDispoLoading(false)
    }
  }

  async function retirerDispo() {
    if (!currentUser) return
    const myDispo = disponibilites.find((d) => d.consultant_id === currentUser.id)
    if (!myDispo) return
    try {
      await disponibilitesAPI.deactivate(myDispo.id)
      toast.info('Disponibilité retirée.')
      loadData()
    } catch (e) { toast.error(e.message) }
  }

  const myDispo = disponibilites.find((d) => d.consultant_id === currentUser?.id)

  if (loading) return <PageLoader />

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Bannière ────────────────────────────────────────────────── */}
      <div className="card p-6 sm:p-8 border-l-4 border-l-bp-red">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bp-dark mb-1">
              Bonjour{currentUser ? `, ${currentUser.nom.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-gray-500 text-sm">
              Portail de collaboration de l'équipe TMT — BearingPoint
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <button onClick={() => setShowDemModal(true)} className="btn-primary">
              🆘 Poster une demande
            </button>
            {myDispo ? (
              <button onClick={retirerDispo} className="btn-secondary">
                ✋ Retirer ma dispo
              </button>
            ) : (
              <button onClick={() => setShowDispoModal(true)} className="btn-secondary">
                🙋 Proposer mon aide
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard emoji="📋" value={openCount}   label="Demandes ouvertes"   color="red" />
        <StatCard emoji="🙋" value={helperCount} label="Helpers disponibles" color="green" />
        <StatCard
          emoji="⭐"
          value={consultants.reduce((s, c) => s + (c.total_points || 0), 0)}
          label="Points distribués"
          color="bp"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ── Deux colonnes ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* 🔴 Surchargés */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔴</span>
            <h2 className="text-lg font-semibold text-bp-dark">Qui a besoin d'aide ?</h2>
            <span className="ml-auto badge bg-red-100 text-bp-red">{surcharges.length}</span>
          </div>
          {surcharges.length === 0 ? (
            <EmptyState icon="🎉" title="Tout le monde est OK !"
              description="Aucun consultant n'a de demande ouverte pour l'instant." />
          ) : (
            <div className="space-y-3">
              {surcharges.map(({ consultant, demandes: dems }) => (
                <div key={consultant.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <Avatar nom={consultant.nom} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{consultant.nom}</div>
                      <div className="text-xs text-gray-500">{consultant.grade}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dems.slice(0, 3).map((d) => (
                          <span key={d.id} className="badge bg-red-50 text-bp-red border border-red-100 text-xs">
                            {d.titre.length > 28 ? d.titre.slice(0, 28) + '…' : d.titre}
                          </span>
                        ))}
                        {dems.length > 3 && (
                          <span className="badge bg-gray-100 text-gray-600">+{dems.length - 3} autres</span>
                        )}
                      </div>
                    </div>
                    <Link to="/demandes" className="btn-secondary text-xs shrink-0">Aider →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🟢 Disponibles */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🟢</span>
            <h2 className="text-lg font-semibold text-bp-dark">Qui peut aider ?</h2>
            <span className="ml-auto badge bg-emerald-100 text-emerald-700">{disponibilites.length}</span>
          </div>
          {disponibilites.length === 0 ? (
            <EmptyState icon="🤔" title="Personne de disponible"
              description="Soyez le premier à proposer votre aide à vos collègues !"
              action={
                <button onClick={() => setShowDispoModal(true)} className="btn-primary">
                  🙋 Proposer mon aide
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {disponibilites.map((d) => (
                <div key={d.id} className="card p-4 hover:shadow-md transition-shadow border-l-4 border-l-emerald-400">
                  <div className="flex items-start gap-3">
                    <Avatar nom={d.consultant?.nom || '?'} size="md" color="green" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{d.consultant?.nom}</span>
                        {surchargesIds.has(d.consultant?.id) && (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">occupé·e aussi</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">{d.consultant?.grade}</div>

                      {/* Dates de disponibilité */}
                      {d.date_debut && d.date_fin ? (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                          <span className="text-emerald-600 font-medium">
                            📅 Du {formatDate(d.date_debut)} au {formatDate(d.date_fin)}
                          </span>
                          <span className="text-gray-600">
                            ⏱ {d.heures_par_jour}h/jour
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-medium text-sm">
                          ⏱ {d.heures_disponibles_par_semaine}h/semaine
                        </span>
                      )}

                      {d.note && (
                        <p className="mt-1 text-xs text-gray-500 italic">"{d.note}"</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-bp-red">{d.consultant?.total_points || 0} pts</div>
                      <div className="text-xs text-gray-400">{getLevel(d.consultant?.total_points).label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal : Poster une demande ───────────────────────────────── */}
      <Modal isOpen={showDemModal} onClose={() => setShowDemModal(false)} title="🆘 Poster une demande d'aide" size="lg">
        <form onSubmit={submitDemande} className="space-y-4">
          <div>
            <label className="label">Demandeur *</label>
            <select className="input" value={demForm.demandeur_id}
              onChange={(e) => setDemForm({ ...demForm, demandeur_id: e.target.value })} required>
              <option value="">— Sélectionnez —</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.grade})</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie *</label>
              <select className="input" value={demForm.categorie}
                onChange={(e) => setDemForm({ ...demForm, categorie: e.target.value })} required>
                <option value="">— Catégorie —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Heures estimées * (1–8)</label>
              <input type="number" min="1" max="8" className="input"
                value={demForm.heures_estimees}
                onChange={(e) => setDemForm({ ...demForm, heures_estimees: parseInt(e.target.value) || 1 })} required />
            </div>
          </div>
          <div>
            <label className="label">Titre de la demande *</label>
            <input type="text" className="input" placeholder="Ex : Préparer 5 slides sur le marché IoT"
              value={demForm.titre}
              onChange={(e) => setDemForm({ ...demForm, titre: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Décrivez le contexte et ce dont vous avez besoin…"
              value={demForm.description}
              onChange={(e) => setDemForm({ ...demForm, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Notifier des personnes spécifiques</label>
            <p className="text-xs text-gray-500 mb-2">Les admins reçoivent toujours une notification.</p>
            <div className="border border-gray-200 rounded-lg divide-y max-h-44 overflow-y-auto">
              {consultants.filter((c) => c.id !== demForm.demandeur_id).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="rounded accent-bp-red"
                    checked={demForm.consultants_notifies.includes(c.id)}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...demForm.consultants_notifies, c.id]
                        : demForm.consultants_notifies.filter((id) => id !== c.id)
                      setDemForm({ ...demForm, consultants_notifies: ids })
                    }} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.nom}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </div>
                  {c.is_admin && <span className="ml-auto badge bg-red-100 text-bp-red text-xs">Admin</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowDemModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={demLoading} className="btn-primary">
              {demLoading ? 'Envoi…' : '📨 Poster la demande'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal : Proposer son aide (avec dates) ───────────────────── */}
      <Modal isOpen={showDispoModal} onClose={() => setShowDispoModal(false)} title="🙋 Proposer mon aide" size="sm">
        {!currentUser ? (
          <p className="text-sm text-gray-600 text-center py-4">
            Veuillez d'abord sélectionner votre profil en cliquant sur votre nom en haut.
          </p>
        ) : (
          <form onSubmit={submitDispo} className="space-y-4">
            <p className="text-sm text-gray-600">
              Indiquez la période pendant laquelle vous êtes disponible pour aider vos collègues.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date de début *</label>
                <input type="date" className="input"
                  value={dispoForm.date_debut}
                  min={today}
                  onChange={(e) => setDispoForm({ ...dispoForm, date_debut: e.target.value })}
                  required />
              </div>
              <div>
                <label className="label">Date de fin *</label>
                <input type="date" className="input"
                  value={dispoForm.date_fin}
                  min={dispoForm.date_debut || today}
                  onChange={(e) => setDispoForm({ ...dispoForm, date_fin: e.target.value })}
                  required />
              </div>
            </div>

            <div>
              <label className="label">Heures disponibles par jour (1–8)</label>
              <input type="number" min="1" max="8" className="input"
                value={dispoForm.heures_par_jour}
                onChange={(e) => setDispoForm({ ...dispoForm, heures_par_jour: parseInt(e.target.value) || 1 })} />
            </div>

            <div>
              <label className="label">Note (optionnel)</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Ex : Disponible en matinée uniquement, préférence pour les slides…"
                value={dispoForm.note}
                onChange={(e) => setDispoForm({ ...dispoForm, note: e.target.value })} />
            </div>

            {/* Aperçu */}
            {dispoForm.date_debut && dispoForm.date_fin && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
                📅 Du <strong>{formatDate(dispoForm.date_debut)}</strong> au <strong>{formatDate(dispoForm.date_fin)}</strong>
                {' '}· <strong>{dispoForm.heures_par_jour}h/jour</strong>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowDispoModal(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={dispoLoading} className="btn-primary">
                {dispoLoading ? 'Enregistrement…' : '✅ Je suis disponible !'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

// ── Sous-composants ─────────────────────────────────────────────────────────

function StatCard({ emoji, value, label, color, className = '' }) {
  const colors = {
    red:   'border-red-100 bg-red-50',
    green: 'border-emerald-100 bg-emerald-50',
    bp:    'border-red-100 bg-red-50',
  }
  const valueColors = {
    red:   'text-bp-red',
    green: 'text-emerald-700',
    bp:    'text-bp-red',
  }
  return (
    <div className={`card p-5 ${colors[color]} ${className}`}>
      <div className="text-2xl mb-2">{emoji}</div>
      <div className={`text-3xl font-bold ${valueColors[color]}`}>{value}</div>
      <div className="text-sm mt-0.5 font-medium text-gray-600">{label}</div>
    </div>
  )
}

function Avatar({ nom, size = 'md', color = 'default' }) {
  const ini = nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const sizes  = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' }
  const colors = {
    default: 'bg-gray-100 text-gray-700',
    green:   'bg-emerald-100 text-emerald-700',
  }
  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {ini}
    </div>
  )
}

export function getLevel(points = 0) {
  if (points >= 100) return { label: 'MVP Helper',    emoji: '🏆', color: 'bg-red-100 text-bp-red border border-red-200' }
  if (points >= 50)  return { label: 'Expert Helper', emoji: '💜', color: 'bg-purple-100 text-purple-800' }
  if (points >= 25)  return { label: 'Bon Helper',    emoji: '💙', color: 'bg-blue-100 text-blue-800' }
  if (points >= 10)  return { label: 'Petit Helper',  emoji: '💚', color: 'bg-emerald-100 text-emerald-800' }
  return                     { label: 'Coéquipier',   emoji: '🤝', color: 'bg-gray-100 text-gray-600' }
}
