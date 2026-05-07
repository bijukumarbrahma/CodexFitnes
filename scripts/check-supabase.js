require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const tables = [
  'profiles',
  'workouts',
  'nutrition_logs',
  'body_stats',
  'goals',
  'step_logs',
  'progress_photos'
];

const isPlaceholder = (value = '') => (
  !value
  || value.includes('your-project')
  || value.includes('your-supabase')
  || value.includes('your-anon')
  || value.includes('your-service')
);

async function main() {
  const missing = requiredEnv.filter((key) => isPlaceholder(process.env[key]));
  if (missing.length) {
    throw new Error(`Missing or placeholder Supabase env vars: ${missing.join(', ')}`);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const results = [];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    results.push({ table, ok: !error, error: error?.message || '' });
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length) {
    console.log('Supabase reached, but the app schema is missing or unavailable:\n');
    failed.forEach((result) => {
      console.log(`- ${result.table}: ${result.error}`);
    });
    console.log('\nRun supabase/schema.sql in the Supabase SQL Editor, then run this check again.');
    process.exitCode = 1;
    return;
  }

  console.log('Supabase connection OK. App tables are available.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
