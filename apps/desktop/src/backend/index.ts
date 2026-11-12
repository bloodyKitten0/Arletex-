import { createDefaultConfig, rootLogger } from '@arletex/core';
import { ArletexBackendServer } from './server.js';

async function main() {
  const logger = rootLogger.child('Backend');
  logger.info('Initializing Arletex Backend Service...');

  const config = createDefaultConfig();
  const server = new ArletexBackendServer(config, logger);

  const desiredPort = process.env['ARLETEX_PORT'] ? parseInt(process.env['ARLETEX_PORT'], 10) : 39281;
  const actualPort = await server.start(desiredPort);

  logger.info(`Arletex Backend is ready on port ${actualPort}`);

  // Notify parent process if spawned via IPC
  if (process.send) {
    process.send({ type: 'ready', port: actualPort });
  }

  const shutdown = async () => {
    logger.info('Shutting down backend service...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main().catch((err) => {
  console.error('Fatal error in Arletex Backend:', err);
  process.exit(1);
});
