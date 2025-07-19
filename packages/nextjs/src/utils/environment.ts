/**
 * Environment detection utilities for Spool CMS
 * Provides reliable detection of server vs client context and environment settings
 */

export interface EnvironmentContext {
  isServer: boolean;
  isClient: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isReactStrictMode: boolean;
}

/**
 * Detect the current execution environment
 * This function works reliably in both server and client contexts
 */
export function detectEnvironment(): EnvironmentContext {
  // Server vs Client detection
  const isServer = typeof window === 'undefined';
  const isClient = !isServer;
  
  // Environment detection
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  // React Strict Mode detection (helps with double rendering issues)
  const isReactStrictMode = isDevelopment && isClient;
  
  return {
    isServer,
    isClient,
    isDevelopment,
    isProduction,
    isReactStrictMode,
  };
}

/**
 * Check if we're running in a server context
 */
export function isServerContext(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if we're running in a client context
 */
export function isClientContext(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if we're in development mode
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get a cache key suffix based on environment
 * This helps prevent cache collisions between different environments
 */
export function getEnvironmentCacheKey(): string {
  const env = detectEnvironment();
  return `${env.isServer ? 'server' : 'client'}-${env.isDevelopment ? 'dev' : 'prod'}`;
}