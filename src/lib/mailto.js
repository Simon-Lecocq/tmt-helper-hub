// ── Utilitaire Outlook Web ────────────────────────────────────────────────────
// On encode chaque ligne séparément avec encodeURIComponent, puis on les joint
// avec %0D%0A (CRLF). C'est le format attendu par Outlook Web pour les sauts
// de ligne dans le paramètre body — contrairement à encodeURIComponent appliqué
// sur tout le texte qui produit %0A seul (ignoré ou affiché en brut par Outlook).

function buildOutlookUrl({ to, subject, lines }) {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '')
  if (!toStr) return null

  const encodedBody = lines
    .map((line) => encodeURIComponent(line))
    .join('%0D%0A')

  return (
    `https://outlook.office.com/mail/deeplink/compose` +
    `?to=${encodeURIComponent(toStr)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodedBody}`
  )
}

// ── Email "Nouvelle demande" ─────────────────────────────────────────────────
export function mailtoNouvelleDemande({
  to, demandeur, grade, titre, categorie, heures_estimees, description, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes?demande=${demandeId}&action=assign`

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    lines: [
      `Bonjour,`,
      ``,
      `${demandeur} (${grade}) a besoin d'aide sur le sujet suivant :`,
      ``,
      `Titre : ${titre}`,
      `Categorie : ${categorie}`,
      `Effort estime : ${heures_estimees}h`,
      `Description : ${description || 'Non precisee'}`,
      ``,
      `Pour accepter cette demande, cliquez sur le lien ci-dessous :`,
      ``,
      link,
      ``,
      `Si vous ne souhaitez pas aider, ignorez simplement ce mail.`,
      ``,
      `Cordialement,`,
      `TMT Helper Hub - BearingPoint TMT`,
    ],
  })
}

// ── Email "Assignation" (admin assigne un helper) ────────────────────────────
export function mailtoAssignation({
  to, demandeur, grade, titre, categorie, heures_estimees, description, demandeId,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes?demande=${demandeId}&action=assign`

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Demande d'aide : ${titre}`,
    lines: [
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
      ``,
      link,
      ``,
      `Cordialement,`,
      `TMT Helper Hub - BearingPoint TMT`,
    ],
  })
}

// ── Email "Acceptation" (helper notifie le demandeur) ───────────────────────
export function mailtoAcceptation({
  to, helperNom, titre, categorie, heures_estimees,
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${appUrl}/demandes`

  return buildOutlookUrl({
    to,
    subject: `[TMT Helper Hub] Votre demande "${titre}" a ete acceptee`,
    lines: [
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
      `Voir toutes les demandes :`,
      ``,
      link,
      ``,
      `Cordialement,`,
      `TMT Helper Hub - BearingPoint TMT`,
    ],
  })
}

// ── Ouvrir Outlook Web dans un nouvel onglet ─────────────────────────────────
export function openMailto(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
