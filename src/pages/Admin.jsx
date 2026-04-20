import { useState, useEffect, useCallback, useRef } from 'react'
import { useCurrentUser } from '../components/Layout'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'
import { PageLoader, EmptyState } from '../components/LoadingSpinner'
import { consultantsAPI } from '../lib/api'
import { getLevel } from './Dashboard'

const GRADES = ['Analyste', 'Consultant', 'Consultant Senior', 'Manager', 'Partner']

const GRADE_COLORS = {
  'Analyste':           'bg-gray-100 text-gray-700',
  'Consultant':         'bg-blue-100 text-blue-700',
  'Consultant Senior':  'bg-indigo-100 text-indigo-700',
  'Manager':            'bg-purple-100 text-purple-700',
  'Partner':            'bg-red-100 text-bp-red',
}

const EMPTY_FORM = { nom: '', email: '', grade: 'Consultant' }

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2810'

export default function Admin() {
  const currentUser = useCurrentUser()
  const toast = useToast()

  const [consultants, setConsultants] = useState([])
  const [loading, setLoading]         = useState(true)

  const [showForm, setShowForm]       = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)

  const [confirmId, setConfirmId]     = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ── PIN admin ────────────────────────────────────────────────────────
  const [pinVerified, setPinVerified]   = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput]         = useState('')
  const [pinError, setPinError]         = useState('')
  const pinTimerRef = useRef(null)

  // Nettoyer le timer au démontage
  useEffect(() => () => { if (pinTimerRef.current) clearTimeout(pinTimerRef.current) }, [])

  function openPinModal() {
    setPinInput('')
    setPinError('')
    setShowPinModal(true)
  }

  function submitPin(e) {
    e.preventDefault()
    if (pinInput === String(ADMIN_PIN)) {
      setPinVerified(true)
      setShowPinModal(false)
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current)
      pinTimerRef.current = setTimeout(() => {
        setPinVerified(false)
        toast.info('Session admin expirée (10 min).')
      }, 10 * 60 * 1000)
    } else {
      setPinError('Code PIN incorrect.')
    }
  }

  async function toggleAdmin(consultant) {
    try {
      await consultantsAPI.update(consultant.id, { is_admin: !consultant.is_admin })
      toast.success(`${consultant.nom} : droits admin ${!consultant.is_admin ? 'accordés' : 'retirés'}.`)
      loadData()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // ────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await consultantsAPI.getAll(true)
      setConsultants(data || [])
    } catch (e) {
      toast.error('Erreur chargement : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(consultant) {
    setEditTarget(consultant)
    setForm({ nom: consultant.nom, email: consultant.email, grade: consultant.grade })
    setShowForm(true)
  }

  async function submitForm(e) {
    e.preventDefault()
    if (!form.nom || !form.email || !form.grade) return toast.error('Nom, email et grade sont obligatoires.')
    setFormLoading(true)
    try {
      if (editTarget) {
        await consultantsAPI.update(editTarget.id, form)
        toast.success(`Consultant "${form.nom}" mis à jour.`)
      } else {
        await consultantsAPI.create(form)
        toast.success(`Consultant "${form.nom}" ajouté à l'équipe !`)
      }
      setShowForm(false)
      loadData()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function toggleActif(consultant) {
    try {
      const newStatut = consultant.statut === 'actif' ? 'inactif' : 'actif'
      await consultantsAPI.update(consultant.id, { statut: newStatut })
      toast.success(`${consultant.nom} est maintenant ${newStatut}.`)
      loadData()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function confirmDelete() {
    setConfirmLoading(true)
    try {
      await consultantsAPI.delete(confirmId)
      toast.success('Consultant désactivé (suppression douce).')
      setConfirmId(null)
      loadData()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setConfirmLoading(false)
    }
  }

  const actifs   = consultants.filter((c) => c.statut === 'actif')
  const inactifs = consultants.filter((c) => c.statut === 'inactif')

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bp-dark">👥 Gestion de l'équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {actifs.length} membre{actifs.length > 1 ? 's' : ''} actif{actifs.length > 1 ? 's' : ''}
            {inactifs.length > 0 && ` · ${inactifs.length} inactif${inactifs.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          + Ajouter un consultant
        </button>
      </div>

      {/* ── Info accès admin ────────────────────────────────────────── */}
      {currentUser && !currentUser.is_admin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <span className="shrink-0">⚠️</span>
          <span>
            Vous n'avez pas les droits administrateur. Vous pouvez consulter l'équipe,
            mais seuls les admins peuvent modifier les profils.
          </span>
        </div>
      )}

      {/* ── Membres actifs ──────────────────────────────────────────── */}
      {actifs.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucun membre dans l'équipe"
          description="Commencez par ajouter les membres de votre équipe TMT."
          action={<button onClick={openCreate} className="btn-primary">+ Ajouter le premier consultant</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-bp-dark">Membres actifs</h2>
            <span className="badge bg-emerald-100 text-emerald-700">{actifs.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {actifs.map((c) => (
              <ConsultantRow
                key={c.id}
                consultant={c}
                currentUser={currentUser}
                onEdit={() => openEdit(c)}
                onToggle={() => toggleActif(c)}
                onDelete={() => setConfirmId(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Membres inactifs ────────────────────────────────────────── */}
      {inactifs.length > 0 && (
        <div className="card overflow-hidden opacity-70">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-500">Membres inactifs</h2>
            <span className="badge bg-gray-100 text-gray-500">{inactifs.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {inactifs.map((c) => (
              <ConsultantRow
                key={c.id}
                consultant={c}
                currentUser={currentUser}
                onEdit={() => openEdit(c)}
                onToggle={() => toggleActif(c)}
                onDelete={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Droits administrateurs (PIN-protégé) ────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-bp-dark">⚙️ Droits administrateurs</h2>
            <p className="text-xs text-gray-500 mt-0.5">Accès restreint — code PIN requis</p>
          </div>
          {!pinVerified ? (
            <button onClick={openPinModal} className="btn-secondary text-sm">
              🔐 Déverrouiller
            </button>
          ) : (
            <button
              onClick={() => { setPinVerified(false); if (pinTimerRef.current) clearTimeout(pinTimerRef.current) }}
              className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              🔓 Verrouiller
            </button>
          )}
        </div>

        {pinVerified ? (
          <div className="divide-y divide-gray-50">
            {actifs.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{c.nom}</div>
                  <div className="text-xs text-gray-500">{c.grade} · {c.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">Admin</span>
                  <button
                    onClick={() => toggleAdmin(c)}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                      c.is_admin ? 'bg-bp-red' : 'bg-gray-200'
                    }`}
                    title={c.is_admin ? 'Retirer les droits admin' : 'Accorder les droits admin'}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      c.is_admin ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                  {c.is_admin && <span className="badge bg-red-100 text-bp-red text-xs">⚙️ Admin</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            🔐 Entrez le code PIN pour gérer les droits administrateurs.
          </div>
        )}
      </div>

      {/* ── Modal : Créer / Modifier ─────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? `✏️ Modifier — ${editTarget.nom}` : '+ Nouveau consultant'}
        size="sm"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <div>
            <label className="label">Nom complet *</label>
            <input type="text" className="input" placeholder="Prénom Nom" value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          </div>
          <div>
            <label className="label">Adresse email *</label>
            <input type="email" className="input" placeholder="prenom.nom@bearingpoint.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Grade *</label>
            <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={formLoading} className="btn-primary">
              {formLoading ? 'Enregistrement…' : (editTarget ? '✅ Mettre à jour' : '+ Ajouter')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal : Confirmation désactivation ──────────────────────── */}
      <Modal isOpen={!!confirmId} onClose={() => setConfirmId(null)} title="⚠️ Confirmer la désactivation" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Le consultant sera désactivé (suppression douce). Son historique de contributions
            et ses points sont conservés.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmId(null)} className="btn-secondary">Annuler</button>
            <button onClick={confirmDelete} disabled={confirmLoading} className="btn-danger">
              {confirmLoading ? 'Désactivation…' : 'Désactiver'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal : Code PIN admin ───────────────────────────────────── */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="🔐 Accès administrateur" size="sm">
        <form onSubmit={submitPin} className="space-y-4">
          <p className="text-sm text-gray-600">
            Entrez le code PIN pour accéder à la gestion des droits administrateurs.
          </p>
          <div>
            <label className="label">Code PIN *</label>
            <input
              type="password"
              className="input tracking-widest text-center text-lg"
              placeholder="••••"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError('') }}
              autoFocus
              maxLength={10}
            />
            {pinError && <p className="text-sm text-bp-red mt-1">{pinError}</p>}
          </div>
          <p className="text-xs text-gray-400">
            La session expire automatiquement après 10 minutes.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowPinModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">🔓 Déverrouiller</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Ligne consultant ────────────────────────────────────────────────────────

function ConsultantRow({ consultant: c, currentUser, onEdit, onToggle, onDelete }) {
  const ini = c.nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const level = getLevel(c.total_points)
  const gradeColor = GRADE_COLORS[c.grade] || GRADE_COLORS['Analyste']
  const isMe = currentUser?.id === c.id

  return (
    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${isMe ? 'bg-red-50/50' : ''}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        c.statut === 'actif' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-400'
      }`}>
        {ini}
      </div>

      {/* Nom + grade */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${c.statut === 'inactif' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {c.nom}
          </span>
          {isMe && <span className="badge bg-red-100 text-bp-red text-xs">Vous</span>}
          {c.is_admin && <span className="badge bg-red-100 text-bp-red text-xs">⚙️ Admin</span>}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
          <span className={`badge ${gradeColor} text-xs`}>{c.grade}</span>
          <span className="hidden sm:inline text-gray-400">{c.email}</span>
        </div>
      </div>

      {/* Points + niveau */}
      <div className="hidden sm:block text-right shrink-0">
        <div className="text-sm font-bold text-bp-red">{c.total_points || 0} pts</div>
        <div className="text-xs text-gray-400">{level.emoji} {level.label}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-sm"
          title="Modifier"
        >
          ✏️
        </button>
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg text-sm transition-colors ${
            c.statut === 'actif'
              ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
              : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'
          }`}
          title={c.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
        >
          {c.statut === 'actif' ? '🔇' : '🔔'}
        </button>
        {onDelete && c.statut === 'actif' && (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
            title="Supprimer"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
