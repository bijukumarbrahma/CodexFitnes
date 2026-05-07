const { createClient } = require('@supabase/supabase-js');

const enabled = () => process.env.USE_SUPABASE === 'true' || Boolean(process.env.SUPABASE_URL);

const required = () => {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    .filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Supabase env vars: ${missing.join(', ')}`);
  }
};

const service = () => {
  required();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

const anon = () => {
  required();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
};

module.exports = {
  enabled,
  service,
  anon
};
