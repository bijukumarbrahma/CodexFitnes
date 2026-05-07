const serverless = require('serverless-http');
process.env.NETLIFY = 'true';

const app = require('../../app');

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const functionPath = '/.netlify/functions/api';

  if (event.path && event.path.startsWith(functionPath)) {
    const rest = event.path.slice(functionPath.length);
    event.path = `/api${rest || ''}`;
  }

  return handler(event, context);
};
