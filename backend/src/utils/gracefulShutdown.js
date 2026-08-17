function createGracefulShutdown({ server, prisma, logger = console, exit = process.exit, timeoutMs = 10000 }) {
  let shutdownPromise;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      logger.log('Shutdown requested', { signal, timestamp: new Date().toISOString() });
      const timeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out', { signal, timeoutMs });
        exit(1);
      }, timeoutMs);
      timeout.unref?.();

      try {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        await prisma.$disconnect();
        clearTimeout(timeout);
        logger.log('Shutdown complete', { signal, timestamp: new Date().toISOString() });
        exit(0);
      } catch (error) {
        clearTimeout(timeout);
        logger.error('Graceful shutdown failed', { signal, errorName: error?.name || 'Error', errorMessage: error?.message || 'Unknown error' });
        exit(1);
      }
    })();

    return shutdownPromise;
  };
}

module.exports = { createGracefulShutdown };
