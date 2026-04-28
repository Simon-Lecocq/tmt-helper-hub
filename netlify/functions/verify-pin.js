const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Méthode non autorisée.' });

  const { pin } = JSON.parse(event.body || '{}');
  if (!pin) return respond(400, { error: 'PIN manquant.' });

  const ADMIN_PIN = process.env.ADMIN_PIN;
  if (!ADMIN_PIN) {
    console.error('[verify-pin] Variable ADMIN_PIN non définie côté serveur.');
    // Retourner 200 avec misconfigured pour que le frontend puisse afficher
    // un message clair plutôt que de tomber dans le catch ou le else générique.
    return respond(200, { valid: false, misconfigured: true });
  }

  return respond(200, { valid: String(pin).trim() === String(ADMIN_PIN).trim() });
};
