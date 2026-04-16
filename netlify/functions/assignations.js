const { getSupabase } = require('./utils/supabaseClient');
const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const supabase = getSupabase();

  try {
    // ── GET — liste des assignations (avec filtre mois) ──────────────────
    if (event.httpMethod === 'GET') {
      const { month, year } = event.queryStringParameters || {};
      let query = supabase
        .from('assignations')
        .select(`
          *,
          helper:consultants!assignations_helper_id_fkey(id, nom, email, grade),
          demande:demandes(id, titre, categorie, heures_estimees)
        `)
        .order('completed_at', { ascending: false });

      if (month && year) {
        const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
        const end = new Date(parseInt(year), parseInt(month), 1).toISOString();
        query = query.gte('completed_at', start).lt('completed_at', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return respond(200, data);
    }

    return respond(405, { error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('[assignations]', err);
    return respond(500, { error: err.message });
  }
};
