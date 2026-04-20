import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../components/Layout'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'
import { PageLoader, EmptyState } from '../components/LoadingSpinner'
import { consultantsAPI, demandesAPI } from '../lib/api'
import { getLevel } from './Dashboard'
import { mailtoNouvelleDemande, mailtoAssignation, mailtoAcceptation, openMailto } from '../lib/mailto'

const CATEGORIES = [
  'Slides / Présentation',
  'Recherche & Benchmark',
  'Analyse de données',
  'Support projet',
  'Projet interne',
  'Autre',
]

const STATUTS = [
  { value: '',           label: 'Tous les statuts' },
  { value: 'ouverte',    label: 'Ouvert' },
  { value: 'en_cours',   label: 'En cours' },
  { value: 'completee',  label: 'Complétée' },
]

const STATUT_CONFIG = {
  ouverte:   { label: 'Ouvert',    color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500' },
  en_cours:  { label: 'En cours',  color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  completee: { label: 'Complétée', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
}

const CAT_COLORS = {
  'Slides / Présentation':  'bg-indigo-100 text-indigo-700',
  'Recherche & Benchmark':  'bg-cyan-100 text-cyan-700',
  'Analyse de données':     'bg-violet-100 text-violet-700',
  'Support projet':         'bg-orange-100 text-orange-700',
  'Projet interne':         'bg-teal-100 text-teal-700',
  'Autre':                  'bg-gray-100 text-gray-600',
}

export default function Demandes() {
  const currentUser = useCurrentUser()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlHandled = useRef(false)

  const [demandes, setDemandes]         = useState([])
  const [consultants, setConsultants]   = useState([])
  const [loading, setLoading]           = useState(true)

  // Filtres
  const [filterCat,    setFilterCat]    = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterCons,   setFilterCons]   = useState('')

  // Modale création
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    titre: '', categorie: '', description: '', heures_estimees: 2,
    demandeur_id: '', consultants_notifies: [],
  })
  const [formLoading, setFormLoading] = useState(false)

  // Modale accept/refuse (depuis lien email)
  const [showAccept, setShowAccept]   = useState(false)
  const [acceptDemande, setAcceptDemande] = useState(null)
  const [acceptLoading, setAcceptLoading] = useState(false)

  // Modale assignation admin
  const [showAssign, setShowAssign]       = useState(false)
  const [assignDemande, setAssignDemande] = useState(null)
  const [assignHelperID, setAssignHelperID] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  // Modale complétion
  const [showComplete, setShowComplete]       = useState(false)
  const [completeDemande, setCompleteDemande] = useState(null)
  const [completeHeures, setCompleteHeures]   = useState(2)
  const [completeLoading, setCompleteLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dem, cons] = await Promise.all([
        demandesAPI.getAll({ categorie: filterCat, statut: filterStatut, consultant_id: filterCons }),
        consultantsAPI.getAll(),
      ])
      setDemandes(dem || [])
      setConsultants(cons || [])
    } catch (e) {
      toast.error('Erreur chargement : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [filterCat, filterStatut, filterCons])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (currentUser) setForm((f) => ({ ...f, demandeur_id: currentUser.id }))
  }, [currentUser])

  // ── Gestion lien email ?demande=id&action=assign ──────────────────────
  useEffect(() => {
    if (urlHandled.current || loading || demandes.length === 0) return
    const demandeId = searchParams.get('demande')
    const action    = searchParams.get('action')
    if (!demandeId || action !== 'assign') return

    const d = demandes.find((d) => d.id === demandeId)
    if (!d) return

    urlHandled.current = true
    setSearchParams({}) // nettoyer l'URL
    setAcceptDemande(d)
    setShowAccept(true)
  }, [loading, demandes])

  // ── Créer ──────────────────────────────────────────────────────────────
  async function submitCreate(e) {
    e.preventDefault()
    if (!form.demandeur_id) return toast.error('Sélectionnez le demandeur.')
    if (!form.titre)        return toast.error('Le titre est obligatoire.')
    if (!form.categorie)    return toast.error('La catégorie est obligatoire.')
    setFormLoading(true)
    try {
      const demande = await demandesAPI.create(form)
      toast.success('Demande créée !')
      setShowCreate(false)

      // Mailto : notifiés + admins, hors demandeur
      const notifyIds = new Set(form.consultants_notifies)
      consultants.filter((c) => c.is_admin).forEach((c) => notifyIds.add(c.id))
      const toEmails = consultants
        .filter((c) => notifyIds.has(c.id) && c.id !== form.demandeur_id)
        .map((c) => c.email).filter(Boolean)
      if (toEmails.length > 0) {
        const demandeur = consultants.find((c) => c.id === form.demandeur_id)
        openMailto(mailtoNouvelleDemande({
          to: toEmails,
          demandeur: demandeur?.nom || '',
          grade: demandeur?.grade || '',
          titre: form.titre,
          categorie: form.categorie,
          heures_estimees: form.heures_estimees,
          description: form.description,
          demandeId: demande.id,
        }))
      }

      setForm({ titre: '', categorie: '', description: '', heures_estimees: 2, demandeur_id: currentUser?.id || '', consultants_notifies: [] })
      loadData()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  // ── Accepter (bouton direct ou depuis lien email) ──────────────────────
  async function accepter(demande) {
    if (!currentUser) return toast.error("Sélectionnez votre profil d'abord.")
    if (demande.demandeur_id === currentUser.id) return toast.error('Vous ne pouvez pas accepter votre propre demande.')
    setAcceptLoading(true)
    try {
      await demandesAPI.accept(demande.id, currentUser.id)
      toast.success('Demande acceptée ! Ouvrez le mail pour notifier le demandeur.')
      setShowAccept(false)
      loadData()
      // Mailto → demandeur
      if (demande.demandeur?.email) {
        openMailto(mailtoAcceptation({
          to: demande.demandeur.email,
          helperNom: currentUser.nom,
          titre: demande.titre,
          categorie: demande.categorie,
          heures_estimees: demande.heures_estimees,
          demandeId: demande.id,
        }))
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAcceptLoading(false)
    }
  }

  // ── Assigner (admin) ───────────────────────────────────────────────────
  async function submitAssign(e) {
    e.preventDefault()
    if (!assignHelperID) return toast.error('Sélectionnez un consultant.')
    setAssignLoading(true)
    try {
      await demandesAPI.assign(assignDemande.id, assignHelperID)
      toast.success('Demande assignée !')
      setShowAssign(false)
      loadData()
      // Mailto → helper assigné
      const helper = consultants.find((c) => c.id === assignHelperID)
      if (helper?.email) {
        const demandeur = consultants.find((c) => c.id === assignDemande.demandeur_id) || assignDemande.demandeur
        openMailto(mailtoAssignation({
          to: helper.email,
          demandeur: demandeur?.nom || '',
          grade: demandeur?.grade || '',
          titre: assignDemande.titre,
          categorie: assignDemande.categorie,
          heures_estimees: assignDemande.heures_estimees,
          description: assignDemande.description,
          demandeId: assignDemande.id,
        }))
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAssignLoading(false)
    }
  }

  // ── Marquer complétée ──────────────────────────────────────────────────
  async function submitComplete(e) {
    e.preventDefault()
    setCompleteLoading(true)
    try {
      await demandesAPI.complete(completeDemande.id, completeHeures)
      toast.success(`Tâche complétée ! ${completeHeures} point(s) attribué(s).`)
      setShowComplete(false)
      loadData()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCompleteLoading(false)
    }
  }

  const isAdmin = currentUser?.is_admin

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bp-dark">📋 Demandes d'aide</h1>
          <p className="text-sm text-gray-500 mt-0.5">{demandes.length} demande{demandes.length > 1 ? 's' : ''} affichée{demandes.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
          + Nouvelle demande
        </button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input text-sm flex-1 min-w-36" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input text-sm flex-1 min-w-36" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input text-sm flex-1 min-w-36" value={filterCons} onChange={(e) => setFilterCons(e.target.value)}>
          <option value="">Tous les consultants</option>
          {consultants.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        {(filterCat || filterStatut || filterCons) && (
          <button
            onClick={() => { setFilterCat(''); setFilterStatut(''); setFilterCons('') }}
            className="btn-secondary text-sm"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* ── Liste ─────────────────────────────────────────────────────── */}
      {demandes.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucune demande trouvée"
          description="Aucune demande ne correspond à vos filtres, ou l'équipe n'a pas encore besoin d'aide !"
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              + Créer la première demande
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => (
            <DemandeCard
              key={d.id}
              demande={d}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onAccept={() => accepter(d)}
              onAssign={() => { setAssignDemande(d); setAssignHelperID(''); setShowAssign(true) }}
              onComplete={() => { setCompleteDemande(d); setCompleteHeures(d.heures_estimees || 2); setShowComplete(true) }}
            />
          ))}
        </div>
      )}

      {/* ── Modal : Accept / Refuse depuis lien email ─────────────────── */}
      <Modal isOpen={showAccept} onClose={() => setShowAccept(false)} title="📩 Demande d'aide" size="sm">
        {acceptDemande && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{acceptDemande.demandeur?.nom}</strong> ({acceptDemande.demandeur?.grade}) a besoin d'aide :
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><strong>📌 Titre :</strong> {acceptDemande.titre}</div>
              <div><strong>📂 Catégorie :</strong> {acceptDemande.categorie}</div>
              <div><strong>⏱ Effort :</strong> {acceptDemande.heures_estimees}h estimées</div>
              {acceptDemande.description && (
                <div><strong>📝 Description :</strong> {acceptDemande.description}</div>
              )}
            </div>
            {!currentUser && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                ⚠️ Sélectionnez votre profil (en haut) avant d'accepter.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAccept(false)} className="btn-secondary">
                ✕ Refuser
              </button>
              <button
                onClick={() => accepter(acceptDemande)}
                disabled={acceptLoading || !currentUser || acceptDemande.demandeur_id === currentUser?.id}
                className="btn-success"
              >
                {acceptLoading ? 'Acceptation…' : '🙋 Accepter la demande'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal : Créer demande ──────────────────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="+ Nouvelle demande d'aide" size="lg">
        <form onSubmit={submitCreate} className="space-y-4">
          <div>
            <label className="label">Demandeur *</label>
            <select className="input" value={form.demandeur_id} onChange={(e) => setForm({ ...form, demandeur_id: e.target.value })} required>
              <option value="">— Sélectionnez —</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.grade})</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie *</label>
              <select className="input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} required>
                <option value="">— Catégorie —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Heures estimées * (1–8)</label>
              <input type="number" min="1" max="8" className="input" value={form.heures_estimees}
                onChange={(e) => setForm({ ...form, heures_estimees: parseInt(e.target.value) || 1 })} required />
            </div>
          </div>
          <div>
            <label className="label">Titre *</label>
            <input type="text" className="input" placeholder="Ex : Préparer 5 slides sur le marché IoT"
              value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Décrivez le contexte et ce dont vous avez besoin…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Notifier des personnes spécifiques</label>
            <p className="text-xs text-gray-500 mb-2">Les admins reçoivent toujours une notification.</p>
            <div className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
              {consultants.filter((c) => c.id !== form.demandeur_id).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="rounded accent-[#E3002B]"
                    checked={form.consultants_notifies.includes(c.id)}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...form.consultants_notifies, c.id]
                        : form.consultants_notifies.filter((id) => id !== c.id)
                      setForm({ ...form, consultants_notifies: ids })
                    }} />
                  <div>
                    <div className="text-sm font-medium">{c.nom}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </div>
                  {c.is_admin && <span className="ml-auto badge bg-red-100 text-bp-red text-xs">Admin</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={formLoading} className="btn-primary">
              {formLoading ? 'Envoi…' : '📨 Poster la demande'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal : Assigner (admin) ────────────────────────────────────── */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="👤 Assigner la demande" size="sm">
        {assignDemande && (
          <form onSubmit={submitAssign} className="space-y-4">
            <p className="text-sm text-gray-600">
              Demande : <strong>{assignDemande.titre}</strong>
            </p>
            <div>
              <label className="label">Assigner à *</label>
              <select className="input" value={assignHelperID} onChange={(e) => setAssignHelperID(e.target.value)} required>
                <option value="">— Sélectionnez —</option>
                {consultants.filter((c) => c.id !== assignDemande.demandeur_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.nom} ({c.grade})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={assignLoading} className="btn-primary">
                {assignLoading ? 'Assignation…' : '✅ Confirmer'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal : Marquer complétée ───────────────────────────────────── */}
      <Modal isOpen={showComplete} onClose={() => setShowComplete(false)} title="🏁 Marquer comme complétée" size="sm">
        {completeDemande && (
          <form onSubmit={submitComplete} className="space-y-4">
            <p className="text-sm text-gray-600">
              Demande : <strong>{completeDemande.titre}</strong>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-bp-red">
              💡 Les heures créditées valent autant de points pour le helper (1 heure = 1 point).
            </div>
            <div>
              <label className="label">Heures réellement effectuées *</label>
              <input type="number" min="1" max="40" className="input" value={completeHeures}
                onChange={(e) => setCompleteHeures(parseInt(e.target.value) || 1)} required />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowComplete(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={completeLoading} className="btn-success">
                {completeLoading ? 'Enregistrement…' : `🏆 Valider (+${completeHeures} pts)`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

// ── Carte demande ──────────────────────────────────────────────────────────

function DemandeCard({ demande: d, currentUser, isAdmin, onAccept, onAssign, onComplete }) {
  const sc = STATUT_CONFIG[d.statut] || STATUT_CONFIG.ouverte
  const catColor = CAT_COLORS[d.categorie] || CAT_COLORS['Autre']

  // Permissions
  const canAccept   = d.statut === 'ouverte' && currentUser && d.demandeur_id !== currentUser.id
  const canComplete = d.statut === 'en_cours' && currentUser && (
    d.assigne_a === currentUser.id || isAdmin || d.demandeur_id === currentUser.id
  )
  const canAssign   = (d.statut === 'ouverte' || d.statut === 'en_cours') && isAdmin

  const dateStr = d.created_at
    ? new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className={`card p-4 sm:p-5 hover:shadow-md transition-all ${d.statut === 'completee' ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${catColor} text-xs`}>{d.categorie}</span>
            <span className={`badge ${sc.color} text-xs flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <span className="badge bg-gray-100 text-gray-600 text-xs">⏱ {d.heures_estimees}h estimées</span>
          </div>

          <h3 className="font-semibold text-gray-900 mb-1 text-base">{d.titre}</h3>

          {d.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{d.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>👤 <strong>{d.demandeur?.nom || '—'}</strong> · {d.demandeur?.grade}</span>
            {d.assigne && (
              <span>🤝 Aidé par <strong>{d.assigne?.nom}</strong></span>
            )}
            <span>📅 {dateStr}</span>
            {d.statut === 'completee' && d.completed_at && (
              <span>✅ Complétée le {new Date(d.completed_at).toLocaleDateString('fr-FR')}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row sm:flex-col gap-2 shrink-0">
          {canAccept && (
            <button onClick={onAccept} className="btn-success text-xs px-3 py-1.5">
              🙋 Accepter
            </button>
          )}
          {canAssign && (
            <button onClick={onAssign} className="btn-secondary text-xs px-3 py-1.5">
              👤 Assigner
            </button>
          )}
          {canComplete && (
            <button onClick={onComplete} className="btn-primary text-xs px-3 py-1.5">
              🏁 Terminer
            </button>
          )}
          {/* Bouton grisé : demande en cours mais non autorisé à compléter */}
          {d.statut === 'en_cours' && currentUser && !canComplete && !isAdmin && (
            <button
              disabled
              title="Seuls le demandeur, l'assigné ou un admin peuvent marquer comme complétée"
              className="btn-primary text-xs px-3 py-1.5 opacity-30 cursor-not-allowed"
            >
              🏁 Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
