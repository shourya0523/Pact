import { DEMO_MODE } from '../../config';

/**
 * Performance-optimized logger that only logs in development mode
 * This significantly improves performance on physical devices
 * In demo mode, all logging is disabled for maximum performance
 */
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (!DEMO_MODE && isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Only log errors if not in demo mode
    if (!DEMO_MODE) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (!DEMO_MODE && isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (!DEMO_MODE && isDevelopment) {
      console.info(...args);
    }
  },
};

