const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Variables SUPABASE_URL et SUPABASE_ANON_KEY manquantes.');
  return createClient(url, key);
}

module.exports = { getSupabase };
