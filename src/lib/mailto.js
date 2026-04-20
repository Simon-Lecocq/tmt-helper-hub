// ── Utilitaire Outlook Web ────────────────────────────────────────────────────
// Outlook Web deeplink compose accepte du HTML dans le paramètre body,
// ce qui permet des liens cliquables avec texte personnalisé (<a href>).
// Sauts de ligne : <br> en HTML. Encodage : encodeURIComponent sur le body complet.

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

function a(href, text) {
  return `<a href="${href}">${text}</a>`
}

function br(n = 1) {
  return '<br>'.repeat(n)
}

// ── Email "Nouvelle demande" ─────────────────────────────────────────────────
export function mailtoNouvelleDemande({
  to, demandeur, grade, titre, categorie, heures_estimees, description, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes?demande=${demandeId}&action=assign`

  const body = [
    `Bonjour,`,
    br(),
    `${demandeur} (${grade}) a besoin d'aide sur le sujet suivant :`,
    br(),
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱️ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    br(),
    `👉 ${a(link, 'Accepter cette demande sur TMT Helper Hub')}`,
    br(),
    `Si vous ne souhaitez pas aider, ignorez simplement ce mail.`,
    br(),
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('<br>')

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
    br(),
    `Vous avez été assigné·e à la demande d'aide suivante :`,
    br(),
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱️ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    `👤 Demandeur : ${demandeur} (${grade})`,
    br(),
    `👉 ${a(link, 'Accéder à la demande sur TMT Helper Hub')}`,
    br(),
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('<br>')

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
    br(),
    `Bonne nouvelle ! ${helperNom} a accepté de vous aider pour :`,
    br(),
    `📌 Titre : ${titre}`,
    `📂 Catégorie : ${categorie}`,
    `⏱️ Effort estimé : ${heures_estimees}h`,
    br(),
    `Prenez contact avec ${helperNom} pour convenir des modalités.`,
    br(),
    `👉 ${a(link, 'Voir toutes les demandes sur TMT Helper Hub')}`,
    br(),
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('<br>')

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
