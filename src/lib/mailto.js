// ── Utilitaire Outlook Web ────────────────────────────────────────────────────
// Construit un lien Outlook Web (deeplink compose) ouvrant un nouvel onglet
// avec le mail pré-rempli, sans dépendre du client mail configuré sur le PC.
// Plusieurs destinataires séparés par des points-virgules dans le paramètre to.

function buildOutlookUrl({ to, subject, body }) {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '')
  if (!toStr) return null
  const params = new URLSearchParams({
    to: toStr,
    subject,
    body,
  })
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`
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
    `Titre : ${titre}`,
    `Categorie : ${categorie}`,
    `Effort estime : ${heures_estimees}h`,
    `Description : ${description || 'Non precisee'}`,
    ``,
    `Pour accepter cette demande, cliquez ici :`,
    link,
    ``,
    `Pour refuser, ignorez simplement ce mail.`,
    ``,
    `Cordialement,`,
    `TMT Helper Hub - BearingPoint TMT`,
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
    `Vous avez ete assigne(e) a la demande d'aide suivante :`,
    ``,
    `Titre : ${titre}`,
    `Categorie : ${categorie}`,
    `Effort estime : ${heures_estimees}h`,
    `Description : ${description || 'Non precisee'}`,
    `Demandeur : ${demandeur} (${grade})`,
    ``,
    `Acceder a la demande :`,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub - BearingPoint TMT`,
  ].join('\n')

  return buildOutlookUrl({
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
    `Bonne nouvelle ! ${helperNom} a accepte de vous aider pour :`,
    ``,
    `Titre : ${titre}`,
    `Categorie : ${categorie}`,
    `Effort estime : ${heures_estimees}h`,
    ``,
    `Prenez contact avec ${helperNom} pour convenir des modalites.`,
    ``,
    `Voir sur TMT Helper Hub :`,
    link,
    ``,
    `Cordialement,`,
    `TMT Helper Hub - BearingPoint TMT`,
  ].join('\n')

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Votre demande "${titre}" a ete acceptee`,
    body,
  })
}

// ── Ouvrir Outlook Web dans un nouvel onglet ─────────────────────────────────
export function openMailto(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
