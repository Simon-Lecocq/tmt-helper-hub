const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Méthode non autorisée.' });

  const { pin } = JSON.parse(event.body || '{}');
  if (!pin) return respond(400, { error: 'PIN manquant.' });

  const ADMIN_PIN = process.env.ADMIN_PIN;
  if (!ADMIN_PIN) {
    console.error('[verify-pin] Variable ADMIN_PIN non définie côté serveur.');
    return respond(500, { error: 'Configuration serveur manquante.' });
  }

  return respond(200, { valid: String(pin) === String(ADMIN_PIN) });
};
