// ── Utilitaire mailto (Outlook desktop) ──────────────────────────────────────
// Ouvre Outlook desktop via window.location.href = mailto:...
// Corps encodé avec encodeURIComponent par ligne, joints par %0A.
// Outlook desktop détecte automatiquement les URLs sur leur propre ligne
// et les rend bleues et cliquables.

function buildMailto({ to, subject, body }) {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '')
  if (!toStr) return null

  // Encode chaque ligne séparément, joint par %0A
  // → les URLs restent intactes après décodage par Outlook
  const encodedBody = body
    .split('\n')
    .map((line) => encodeURIComponent(line))
    .join('%0A')

  return `mailto:${toStr}?subject=${encodeURIComponent(subject)}&body=${encodedBody}`
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
    `👉 Pour accéder à la demande, copiez ce lien dans votre navigateur :`,
    link,
    ``,
    `Si vous ne souhaitez pas aider, ignorez simplement ce mail.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
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
    `⏱️ Effort estimé : ${heures_estimees}h`,
    `📝 Description : ${description || 'Non précisée'}`,
    `👤 Demandeur : ${demandeur} (${grade})`,
    ``,
    `👉 Pour accéder à la demande, copiez ce lien dans votre navigateur :`,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('\n')

  return buildMailto({
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
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub — BearingPoint TMT 🔵`,
  ].join('\n')

  return buildMailto({
    to,
    subject: `[TMT Helper Hub] Votre demande "${titre}" a été acceptée`,
    body,
  })
}

// ── Ouvrir Outlook desktop via mailto ────────────────────────────────────────
export function openMailto(url) {
  if (url) window.location.href = url
}
