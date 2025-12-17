import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

interface LoggerOptions {
  level?: LogLevel;
  base?: Record<string, unknown>;
}

/**
 * Creates a pino logger instance with appropriate worker environment configuration
 */
export function createLogger(options: LoggerOptions = {}) {
  // In Cloudflare Workers, process is not available
  // We detect environment based on presence of global objects
  const isProduction = typeof (globalThis as { process?: unknown }).process === 'undefined';

  return pino({
    level: options.level || 'info',
    base: {
      env: isProduction ? 'production' : 'development',
      ...options.base,
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    browser: {
      transmit: {
        send: (_level, logEvent) => {
          // In production, logs go to Cloudflare logs
          // In development, logs go to console
          if (!isProduction) {
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(logEvent));
          }
        },
      },
    },
  });
}

// Create the default logger instance
export const logger = createLogger();