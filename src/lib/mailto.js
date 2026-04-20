// ── Utilitaire Outlook Web ────────────────────────────────────────────────────
// Outlook Web deeplink compose n'interprète pas le HTML dans le paramètre body —
// il l'affiche en texte brut. Solution retenue : URL seule sur sa propre ligne,
// entourée de lignes vides. Outlook (et la plupart des clients mail) détecte
// automatiquement les URLs isolées et les rend cliquables.

function buildOutlookUrl({ to, subject, body }) {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '')
  if (!toStr) return null
  return (
    `https://outlook.office.com/mail/deeplink/compose` +
    `?to=${encodeURIComponent(toStr)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  )
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
    `⏱️ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    ``,
    `👉 Pour accepter cette demande, cliquez sur le lien ci-dessous :`,
    ``,
    link,
    ``,
    `Si vous ne souhaitez pas aider, ignorez simplement ce mail.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildOutlookUrl({
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
    `⏱️ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    `👤 Demandeur : ${demandeur} (${grade})`,
    ``,
    `👉 Accéder à la demande :`,
    ``,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    body,
  })
}

// ── Email "Acceptation" (helper notifie le demandeur) ───────────────────────
export function mailtoAcceptation({
  to, helperNom, titre, categorie, heures_estimees,
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
    `⏱️ Effort estimé : ${heures_estimees}h`,
    ``,
    `Prenez contact avec ${helperNom} pour convenir des modalités.`,
    ``,
    `👉 Voir toutes les demandes :`,
    ``,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT`,
  ].join('\n')

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Votre demande "${titre}" a été acceptée`,
    body,
  })
}

// ── Ouvrir Outlook Web dans un nouvel onglet ─────────────────────────────────
export function openMailto(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
