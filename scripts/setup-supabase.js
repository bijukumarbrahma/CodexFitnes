const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

const hide = (value) => value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : '<set>';

async function main() {
  const url = await ask('Supabase Project URL: ');
  const anon = await ask('Supabase anon public key: ');
  const service = await ask('Supabase service_role key: ');
  const jwt = await ask('JWT secret (press Enter to auto-generate): ');
  const clientUrl = await ask('Client URL (local: http://localhost:5000, Netlify URL for deploy): ');

  const secret = jwt || `codex-fitness-${cryptoRandom()}`;
  const env = [
    'PORT=5000',
    'USE_SUPABASE=true',
    `SUPABASE_URL=${url}`,
    `SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    `JWT_SECRET=${secret}`,
    'JWT_EXPIRES_IN=7d',
    `CLIENT_URL=${clientUrl || 'http://localhost:5000'}`
  ].join('\n');

  fs.writeFileSync('.env', `${env}\n`);
  console.log('\n.env updated.');
  console.log(`URL: ${url}`);
  console.log(`Anon: ${hide(anon)}`);
  console.log(`Service role: ${hide(service)}`);

  const supabase = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });

  if (error) {
    console.log('\nSupabase reached, but schema check failed:');
    console.log(error.message);
    console.log('\nRun supabase/schema.sql in Supabase SQL Editor, then run this script again.');
    process.exitCode = 1;
  } else {
    console.log('\nSupabase connection OK. profiles table exists.');
  }
}

function cryptoRandom() {
  return require('crypto').randomBytes(32).toString('hex');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
