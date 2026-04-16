const APP_URL = process.env.URL || 'http://localhost:5173';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_EMAIL_FROM || 'TMT Helper Hub <noreply@tmt-helper-hub.fr>';

  if (!apiKey) {
    console.warn('RESEND_API_KEY manquant — email non envoyé :', subject);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Erreur Resend :', err);
  }
}

function emailNouvelleDemande({ demandeur, titre, categorie, description, heures_estimees }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><style>
  body { font-family: Inter, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(11,31,78,.08); }
  .header { background: #0B1F4E; padding: 32px 40px; text-align: center; }
  .header h1 { color: #C8A84B; margin: 0; font-size: 22px; letter-spacing: .5px; }
  .header p { color: #aabfeb; margin: 6px 0 0; font-size: 13px; }
  .body { padding: 36px 40px; }
  .body h2 { color: #0B1F4E; margin: 0 0 8px; font-size: 18px; }
  .body p { color: #4b5563; line-height: 1.6; margin: 0 0 20px; }
  .card { background: #f0f4ff; border-left: 4px solid #C8A84B; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
  .card table { width: 100%; border-collapse: collapse; }
  .card td { padding: 6px 0; font-size: 14px; }
  .card td:first-child { color: #6b7280; font-weight: 500; width: 140px; }
  .card td:last-child { color: #1f2937; }
  .btn { display: inline-block; background: #0B1F4E; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0; }
  .footer { background: #f0f4ff; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🤝 TMT Helper Hub</h1>
    <p>BearingPoint — Équipe TMT</p>
  </div>
  <div class="body">
    <h2>Nouvelle demande d'aide</h2>
    <p>Bonjour,<br/>
    <strong>${demandeur}</strong> a besoin d'aide et a pensé à vous !</p>
    <div class="card">
      <table>
        <tr><td>Titre :</td><td><strong>${titre}</strong></td></tr>
        <tr><td>Catégorie :</td><td>${categorie}</td></tr>
        <tr><td>Heures estimées :</td><td>${heures_estimees}h</td></tr>
        <tr><td>Description :</td><td>${description || '—'}</td></tr>
      </table>
    </div>
    <p>Si vous êtes disponible, connectez-vous sur TMT Helper Hub pour accepter cette demande.</p>
    <a href="${APP_URL}/demandes" class="btn">Voir la demande →</a>
  </div>
  <div class="footer">TMT Helper Hub · BearingPoint France · <a href="${APP_URL}">Accéder à l'application</a></div>
</div>
</body></html>`;
}

function emailDemandeAcceptee({ helperNom, titre, heures_estimees, demandeurEmail }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><style>
  body { font-family: Inter, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(11,31,78,.08); }
  .header { background: #0B1F4E; padding: 32px 40px; text-align: center; }
  .header h1 { color: #C8A84B; margin: 0; font-size: 22px; }
  .header p { color: #aabfeb; margin: 6px 0 0; font-size: 13px; }
  .body { padding: 36px 40px; }
  .body h2 { color: #0B1F4E; margin: 0 0 8px; font-size: 18px; }
  .body p { color: #4b5563; line-height: 1.6; margin: 0 0 20px; }
  .highlight { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 20px 24px; margin: 20px 0; text-align: center; }
  .highlight .name { font-size: 22px; font-weight: 700; color: #16a34a; }
  .highlight .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .card { background: #f0f4ff; border-left: 4px solid #C8A84B; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .card p { margin: 0; font-size: 14px; color: #374151; }
  .card strong { color: #0B1F4E; }
  .btn { display: inline-block; background: #0B1F4E; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .footer { background: #f0f4ff; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🤝 TMT Helper Hub</h1>
    <p>BearingPoint — Équipe TMT</p>
  </div>
  <div class="body">
    <h2>Bonne nouvelle ! Votre demande a été acceptée ✅</h2>
    <p>Bonjour,</p>
    <div class="highlight">
      <div class="name">${helperNom}</div>
      <div class="label">va vous aider !</div>
    </div>
    <div class="card">
      <p><strong>Demande :</strong> ${titre}</p>
      <p style="margin-top:8px"><strong>Heures estimées :</strong> ${heures_estimees}h</p>
    </div>
    <p>Prenez contact avec <strong>${helperNom}</strong> pour convenir des modalités.</p>
    <a href="${APP_URL}/demandes" class="btn">Voir sur TMT Helper Hub →</a>
  </div>
  <div class="footer">TMT Helper Hub · BearingPoint France · <a href="${APP_URL}">Accéder à l'application</a></div>
</div>
</body></html>`;
}

module.exports = { sendEmail, emailNouvelleDemande, emailDemandeAcceptee };
