'use strict';

const app = require('./src/app');

const port = Number(process.env.PORT) || 8080;

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[web2] user service listening on http://0.0.0.0:${port}`);
});

const shutdown = (signal) => {
  console.log(`[web2] received ${signal}, draining connections`);
  server.close(() => {
    console.log('[web2] server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

server.on('error', (error) => {
  console.error(`[web2] failed to start: ${error.message}`);
  process.exit(1);
});
