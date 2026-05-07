const serverless = require('serverless-http');
process.env.NETLIFY = 'true';

const app = require('../../app');

const handler = serverless(app);

/**
 * Netlify Function → Express path mapper.
 * Ensures that requests like:
 *   /api/auth/login
 * are mapped to Express req.path:
 *   /auth/login
 */
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Netlify gives different shapes depending on how rewrites are configured.
  // Normalize everything to an Express-compatible path.
  const originalPath = event.path || event.rawUrl || '';

  // Common Netlify wrapper paths
  const wrappers = [
    '/.netlify/functions/api',
    '/.netlify/functions/api/',
    '/.netlify/functions/api/api'
  ];

  let nextPath = event.path || '';

  for (const wrapper of wrappers) {
    if (nextPath.startsWith(wrapper)) {
      nextPath = nextPath.slice(wrapper.length);
      break;
    }
  }

  // Normalize to match Express mounting.
  // Express app mounts API handlers at: app.use('/api', supabaseApi)
  // The supabaseApi middleware expects req.path like: '/auth/login', '/auth/register', ...
  // So we must strip any leading '/api' prefix from event.path.
  if (nextPath === '/api') {
    nextPath = '/';
  } else if (nextPath.startsWith('/api/')) {
    nextPath = nextPath.slice('/api'.length);
  }

  // Ensure starts with '/'
  if (nextPath && !nextPath.startsWith('/')) nextPath = `/${nextPath}`;

  event.path = nextPath || '/';


  return handler(event, context);
};

