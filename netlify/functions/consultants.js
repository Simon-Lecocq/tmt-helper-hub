const { getSupabase } = require('./utils/supabaseClient');
const { respond, preflight } = require('./utils/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const supabase = getSupabase();
  const id = event.queryStringParameters?.id;

  try {
    // ── GET — liste des consultants ──────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const includeInactive = event.queryStringParameters?.includeInactive === 'true';
      let query = supabase.from('consultants').select('*').order('nom');
      if (!includeInactive) query = query.eq('statut', 'actif');
      const { data, error } = await query;
      if (error) throw error;
      return respond(200, data);
    }

    // ── POST — créer un consultant ───────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { nom, email, grade, is_admin } = body;
      if (!nom || !email || !grade) return respond(400, { error: 'Champs nom, email et grade obligatoires.' });

      const { data, error } = await supabase
        .from('consultants')
        .insert({ nom, email, grade, is_admin: !!is_admin, statut: 'actif', total_points: 0 })
        .select()
        .single();
      if (error) throw error;
      return respond(201, data);
    }

    // ── PUT — mettre à jour un consultant ────────────────────────────────
    if (event.httpMethod === 'PUT') {
      if (!id) return respond(400, { error: 'Paramètre id manquant.' });
      const body = JSON.parse(event.body || '{}');
      const { nom, email, grade, is_admin, statut } = body;
      const updates = {};
      if (nom !== undefined) updates.nom = nom;
      if (email !== undefined) updates.email = email;
      if (grade !== undefined) updates.grade = grade;
      if (is_admin !== undefined) updates.is_admin = is_admin;
      if (statut !== undefined) updates.statut = statut;

      const { data, error } = await supabase
        .from('consultants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return respond(200, data);
    }

    // ── DELETE — désactivation douce ─────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (!id) return respond(400, { error: 'Paramètre id manquant.' });
      const { data, error } = await supabase
        .from('consultants')
        .update({ statut: 'inactif' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return respond(200, data);
    }

    return respond(405, { error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('[consultants]', err);
    return respond(500, { error: err.message });
  }
};
