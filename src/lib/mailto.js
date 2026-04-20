// ── Utilitaire Outlook Web ────────────────────────────────────────────────────
// Construit un lien Outlook Web (deeplink compose) ouvrant un nouvel onglet
// avec le mail pré-rempli, sans dépendre du client mail configuré sur le PC.
//
// ⚠️  Ne pas utiliser URLSearchParams : il encode les espaces en "+" et les
//     sauts de ligne de façon non standard, ce qui rend le corps illisible.
//     On encode chaque paramètre avec encodeURIComponent et on concatène manuellement.
//
// Plusieurs destinataires séparés par des points-virgules dans le param "to".

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
  to, demandeur, grade, titre, categorie, heures_estimees, description,
}) {
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
    `👉 Pour accepter ou refuser, connectez-vous à TMT Helper Hub et recherchez cette demande.`,
    ``,
    `Si vous avez des questions, contactez directement ${demandeur}.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('\n')

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    body,
  })
}

// ── Email "Assignation" (admin assigne un helper) ────────────────────────────
export function mailtoAssignation({
  to, demandeur, grade, titre, categorie, heures_estimees, description,
}) {
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
    `👉 Connectez-vous à TMT Helper Hub pour accéder à cette demande et convenir des modalités avec ${demandeur}.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
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
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
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
