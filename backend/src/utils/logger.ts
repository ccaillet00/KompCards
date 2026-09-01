import pino from 'pino';

/**
 * Zentrales pino-Logger.
 * In Produktion (JSON) und in Dev (menschlich lesbar) unterschiedlich formatiert.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
});
