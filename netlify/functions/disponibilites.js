const { getSupabase } = require('./utils/supabaseClient');
const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const supabase = getSupabase();
  const id = event.queryStringParameters?.id;

  try {
    // ── GET ──────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const all = event.queryStringParameters?.all === 'true';
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('disponibilites')
        .select(`*, consultant:consultants(id, nom, email, grade, total_points)`)
        .order('date_debut', { ascending: true });

      if (!all) {
        // Actives + (pas de date_fin OU date_fin >= aujourd'hui)
        // Le .or() gère les anciennes lignes sans date_fin (rétrocompatibilité)
        query = query.eq('est_active', true).or(`date_fin.is.null,date_fin.gte.${today}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Désactivation automatique des expirées (fire & forget)
      supabase
        .from('disponibilites')
        .update({ est_active: false })
        .eq('est_active', true)
        .lt('date_fin', today)
        .then(() => {})
        .catch(() => {});

      return respond(200, data);
    }

    // ── POST — créer ou remplacer la disponibilité d'un consultant ───────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const {
        consultant_id,
        date_debut,
        date_fin,
        heures_par_jour,
        note,
        // rétrocompatibilité
        heures_disponibles_par_semaine,
      } = body;

      if (!consultant_id) return respond(400, { error: 'consultant_id obligatoire.' });
      if (!date_debut)    return respond(400, { error: 'date_debut obligatoire.' });
      if (!date_fin)      return respond(400, { error: 'date_fin obligatoire.' });
      if (date_fin < date_debut) return respond(400, { error: 'date_fin doit être après date_debut.' });

      // Désactiver les disponibilités précédentes du consultant
      await supabase
        .from('disponibilites')
        .update({ est_active: false })
        .eq('consultant_id', consultant_id);

      const { data, error } = await supabase
        .from('disponibilites')
        .insert({
          consultant_id,
          date_debut,
          date_fin,
          heures_par_jour:              heures_par_jour || 4,
          heures_disponibles_par_semaine: heures_disponibles_par_semaine || 0,
          note: note || '',
          est_active: true,
        })
        .select(`*, consultant:consultants(id, nom, email, grade, total_points)`)
        .single();

      if (error) throw error;
      return respond(201, data);
    }

    // ── PUT — désactiver une disponibilité ───────────────────────────────
    if (event.httpMethod === 'PUT') {
      if (!id) return respond(400, { error: 'Paramètre id manquant.' });
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('disponibilites')
        .update({ est_active: body.est_active ?? false })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return respond(200, data);
    }

    return respond(405, { error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('[disponibilites]', err);
    return respond(500, { error: err.message });
  }
};
