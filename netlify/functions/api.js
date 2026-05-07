const serverless = require('serverless-http');
process.env.NETLIFY = 'true';

const app = require('../../app');

const handler = serverless(app);

/**
 * Netlify Function -> Express path mapper.
 * Express mounts API handlers at /api, so requests must reach the app as:
 *   /api/auth/login
 */
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  let nextPath = event.path || '';

  if (nextPath.startsWith('/.netlify/functions/api')) {
    nextPath = nextPath.slice('/.netlify/functions/api'.length) || '/';
  }

  if (nextPath && !nextPath.startsWith('/')) nextPath = `/${nextPath}`;

  if (nextPath === '/' || nextPath === '') {
    event.path = '/api';
  } else if (nextPath.startsWith('/api/')) {
    event.path = nextPath;
  } else {
    event.path = `/api${nextPath}`;
  }

  return handler(event, context);
};
