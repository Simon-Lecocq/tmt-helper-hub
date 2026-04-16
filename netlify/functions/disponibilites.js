const { getSupabase } = require('./utils/supabaseClient');
const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const supabase = getSupabase();
  const id = event.queryStringParameters?.id;

  try {
    // ── GET — liste des disponibilités actives ───────────────────────────
    if (event.httpMethod === 'GET') {
      const all = event.queryStringParameters?.all === 'true';
      let query = supabase
        .from('disponibilites')
        .select(`*, consultant:consultants(id, nom, email, grade, total_points)`)
        .order('created_at', { ascending: false });
      if (!all) query = query.eq('est_active', true);

      const { data, error } = await query;
      if (error) throw error;
      return respond(200, data);
    }

    // ── POST — créer ou remplacer la disponibilité d'un consultant ───────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { consultant_id, heures_disponibles_par_semaine, note } = body;
      if (!consultant_id) return respond(400, { error: 'consultant_id obligatoire.' });

      // Désactiver les anciennes disponibilités de ce consultant
      await supabase.from('disponibilites').update({ est_active: false }).eq('consultant_id', consultant_id);

      const { data, error } = await supabase
        .from('disponibilites')
        .insert({
          consultant_id,
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
