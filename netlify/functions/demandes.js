const { getSupabase } = require('./utils/supabaseClient');
const { respond, preflight } = require('./utils/cors');
const { sendEmail, emailNouvelleDemande, emailDemandeAcceptee } = require('./utils/email');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const supabase = getSupabase();
  const id = event.queryStringParameters?.id;
  const action = event.queryStringParameters?.action;

  try {
    // ── GET — liste des demandes ─────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { categorie, statut, consultant_id } = event.queryStringParameters || {};
      let query = supabase
        .from('demandes')
        .select(`
          *,
          demandeur:consultants!demandes_demandeur_id_fkey(id, nom, email, grade),
          assigne:consultants!demandes_assigne_a_fkey(id, nom, email, grade)
        `)
        .order('created_at', { ascending: false });

      if (categorie) query = query.eq('categorie', categorie);
      if (statut) query = query.eq('statut', statut);
      if (consultant_id) query = query.eq('demandeur_id', consultant_id);

      const { data, error } = await query;
      if (error) throw error;
      return respond(200, data);
    }

    // ── POST — créer une demande + envoyer emails ────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { demandeur_id, titre, categorie, description, heures_estimees, consultants_notifies } = body;
      if (!demandeur_id || !titre || !categorie || !heures_estimees) {
        return respond(400, { error: 'Champs demandeur_id, titre, catégorie et heures_estimees obligatoires.' });
      }

      const { data: demande, error: demErr } = await supabase
        .from('demandes')
        .insert({
          demandeur_id,
          titre,
          categorie,
          description: description || '',
          heures_estimees,
          statut: 'ouverte',
          consultants_notifies: consultants_notifies || [],
        })
        .select(`*, demandeur:consultants!demandes_demandeur_id_fkey(id, nom, email)`)
        .single();
      if (demErr) throw demErr;

      // Collecter les destinataires : notifiés + admins (dédupliqués)
      const idsToNotify = new Set(consultants_notifies || []);
      const { data: admins } = await supabase.from('consultants').select('id, email').eq('is_admin', true).eq('statut', 'actif');
      (admins || []).forEach((a) => idsToNotify.add(a.id));

      if (idsToNotify.size > 0) {
        const { data: recipients } = await supabase
          .from('consultants')
          .select('email, nom')
          .in('id', [...idsToNotify])
          .neq('id', demandeur_id)
          .eq('statut', 'actif');

        const emails = (recipients || []).map((r) => r.email).filter(Boolean);
        if (emails.length > 0) {
          await sendEmail({
            to: emails,
            subject: `[TMT Helper Hub] Nouvelle demande d'aide : ${titre}`,
            html: emailNouvelleDemande({
              demandeur: demande.demandeur?.nom || 'Un collègue',
              titre,
              categorie,
              description,
              heures_estimees,
            }),
          });
        }
      }

      return respond(201, demande);
    }

    // ── PUT — accepter / assigner / compléter ────────────────────────────
    if (event.httpMethod === 'PUT') {
      if (!id) return respond(400, { error: 'Paramètre id manquant.' });

      const body = JSON.parse(event.body || '{}');

      // Charger la demande courante
      const { data: current, error: fetchErr } = await supabase
        .from('demandes')
        .select(`*, demandeur:consultants!demandes_demandeur_id_fkey(id, nom, email)`)
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      // ── action = accept ──────────────────────────────────────────────
      if (action === 'accept') {
        const { helper_id } = body;
        if (!helper_id) return respond(400, { error: 'helper_id manquant.' });

        const { data: helper } = await supabase.from('consultants').select('nom, email').eq('id', helper_id).single();

        const { data: updated, error: upErr } = await supabase
          .from('demandes')
          .update({ statut: 'en_cours', assigne_a: helper_id })
          .eq('id', id)
          .select()
          .single();
        if (upErr) throw upErr;

        // Email au demandeur
        if (current.demandeur?.email) {
          await sendEmail({
            to: current.demandeur.email,
            subject: `[TMT Helper Hub] Votre demande "${current.titre}" a été acceptée`,
            html: emailDemandeAcceptee({
              helperNom: helper?.nom || 'Un collègue',
              titre: current.titre,
              heures_estimees: current.heures_estimees,
            }),
          });
        }

        return respond(200, updated);
      }

      // ── action = assign (admin) ──────────────────────────────────────
      if (action === 'assign') {
        const { helper_id } = body;
        if (!helper_id) return respond(400, { error: 'helper_id manquant.' });

        const { data: helper } = await supabase.from('consultants').select('nom, email').eq('id', helper_id).single();

        const { data: updated, error: upErr } = await supabase
          .from('demandes')
          .update({ statut: 'en_cours', assigne_a: helper_id })
          .eq('id', id)
          .select()
          .single();
        if (upErr) throw upErr;

        if (current.demandeur?.email) {
          await sendEmail({
            to: current.demandeur.email,
            subject: `[TMT Helper Hub] Votre demande "${current.titre}" a été assignée`,
            html: emailDemandeAcceptee({
              helperNom: helper?.nom || 'Un collègue',
              titre: current.titre,
              heures_estimees: current.heures_estimees,
            }),
          });
        }

        return respond(200, updated);
      }

      // ── action = complete ────────────────────────────────────────────
      if (action === 'complete') {
        const { heures_creditees } = body;
        if (!heures_creditees) return respond(400, { error: 'heures_creditees manquant.' });

        const helperId = current.assigne_a;
        if (!helperId) return respond(400, { error: 'Aucun helper assigné à cette demande.' });

        // Créer l'assignation
        const { error: assErr } = await supabase.from('assignations').insert({
          demande_id: id,
          helper_id: helperId,
          heures_creditees,
          completed_at: new Date().toISOString(),
        });
        if (assErr) throw assErr;

        // Mettre à jour les points du helper
        const { data: helperData } = await supabase.from('consultants').select('total_points').eq('id', helperId).single();
        await supabase
          .from('consultants')
          .update({ total_points: (helperData?.total_points || 0) + heures_creditees })
          .eq('id', helperId);

        // Marquer la demande comme complétée
        const { data: updated, error: upErr } = await supabase
          .from('demandes')
          .update({ statut: 'completee', completed_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (upErr) throw upErr;

        return respond(200, updated);
      }

      // ── mise à jour générique ────────────────────────────────────────
      const { titre, categorie, description, heures_estimees, statut } = body;
      const updates = {};
      if (titre !== undefined) updates.titre = titre;
      if (categorie !== undefined) updates.categorie = categorie;
      if (description !== undefined) updates.description = description;
      if (heures_estimees !== undefined) updates.heures_estimees = heures_estimees;
      if (statut !== undefined) updates.statut = statut;

      const { data: updated, error: upErr } = await supabase
        .from('demandes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (upErr) throw upErr;
      return respond(200, updated);
    }

    return respond(405, { error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('[demandes]', err);
    return respond(500, { error: err.message });
  }
};
