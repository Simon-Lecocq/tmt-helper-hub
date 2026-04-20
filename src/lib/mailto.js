// ── Utilitaire mailto ─────────────────────────────────────────────────────────
// Construit un lien mailto:// ouvrant le client mail avec sujet + corps pré-remplis.
// window.location.href = mailtoUrl   ← ne navigue pas, ouvre juste le client mail.

function buildMailto({ to, subject, body }) {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(',') : (to || '')
  if (!toStr) return null
  return `mailto:${toStr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ── Email "Nouvelle demande" ─────────────────────────────────────────────────
export function mailtoNouvelleDemande({
  to, demandeur, grade, titre, categorie, heures_estimees, description, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes?demande=${demandeId}&action=assign`

  const body = [
    `Bonjour,`,
    ``,
    `${demandeur} (${grade}) a besoin d'aide sur le sujet suivant :`,
    ``,
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    ``,
    `👉 Pour accepter cette demande, cliquez ici :`,
    link,
    ``,
    `👉 Pour refuser, ignorez simplement ce mail.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildMailto({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    body,
  })
}

// ── Email "Assignation" (admin assigne un helper) ────────────────────────────
export function mailtoAssignation({
  to, demandeur, grade, titre, categorie, heures_estimees, description, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes?demande=${demandeId}&action=assign`

  const body = [
    `Bonjour,`,
    ``,
    `Vous avez été assigné·e à la demande d'aide suivante :`,
    ``,
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    `👤 Demandeur : ${demandeur} (${grade})`,
    ``,
    `👉 Accéder à la demande :`,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildMailto({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    body,
  })
}

// ── Email "Acceptation" (helper notifie le demandeur) ───────────────────────
export function mailtoAcceptation({
  to, helperNom, titre, categorie, heures_estimees, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes`

  const body = [
    `Bonjour,`,
    ``,
    `Bonne nouvelle ! ${helperNom} a accepté de vous aider pour :`,
    ``,
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱ Effort estimé : ${heures_estimees}h`,
    ``,
    `Prenez contact avec ${helperNom} pour convenir des modalités.`,
    ``,
    `👉 Voir sur TMT Helper Hub :`,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildMailto({
    to,
    subject: `[TMT Helper Hub] Votre demande "${titre}" a été acceptée`,
    body,
  })
}

// ── Ouvrir le client mail ────────────────────────────────────────────────────
export function openMailto(url) {
  if (url) window.location.href = url
}
