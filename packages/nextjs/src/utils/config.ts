/**
 * Configuration resolution utilities for Spool CMS
 * Handles environment variable resolution across server and client contexts
 */

import { SpoolConfig } from '../types';
import { detectEnvironment, EnvironmentContext } from './environment';

export interface ResolvedConfig extends SpoolConfig {
  apiKey: string;
  siteId: string;
  baseUrl: string;
  environment: EnvironmentContext;
}

/**
 * Resolve Spool configuration from multiple sources
 * Automatically detects environment and uses appropriate variable sources
 */
export function resolveConfig(config?: Partial<SpoolConfig>): ResolvedConfig {
  const environment = detectEnvironment();
  
  // Resolve API key from multiple sources
  const apiKey = resolveApiKey(config?.apiKey, environment);
  
  // Resolve site ID from multiple sources
  const siteId = resolveSiteId(config?.siteId, environment);
  
  // Resolve base URL with smart defaults
  const baseUrl = resolveBaseUrl(config?.baseUrl, environment);
  
  // Validate required configuration
  validateConfig({ apiKey, siteId, baseUrl });
  
  return {
    apiKey,
    siteId,
    baseUrl,
    environment,
  };
}

/**
 * Resolve API key from environment variables or config
 */
function resolveApiKey(configApiKey?: string, environment?: EnvironmentContext): string {
  const env = environment || detectEnvironment();
  
  // Try config first
  if (configApiKey) {
    return configApiKey;
  }
  
  // Try NEXT_PUBLIC_ prefixed variables first (works in both server and client)
  const publicApiKey = process.env.NEXT_PUBLIC_SPOOL_API_KEY;
  if (publicApiKey) {
    return publicApiKey;
  }
  
  // Fallback to server-only variables for backward compatibility
  if (env.isServer) {
    const serverApiKey = process.env.SPOOL_API_KEY;
    if (serverApiKey) {
      return serverApiKey;
    }
  }
  
  throw new Error(
    `Spool API key not found. Please set NEXT_PUBLIC_SPOOL_API_KEY environment variable or pass apiKey in config.`
  );
}

/**
 * Resolve site ID from environment variables or config
 */
function resolveSiteId(configSiteId?: string, environment?: EnvironmentContext): string {
  const env = environment || detectEnvironment();
  
  // Try config first
  if (configSiteId) {
    return configSiteId;
  }
  
  // Try NEXT_PUBLIC_ prefixed variables first (works in both server and client)
  const publicSiteId = process.env.NEXT_PUBLIC_SPOOL_SITE_ID;
  if (publicSiteId) {
    return publicSiteId;
  }
  
  // Fallback to server-only variables for backward compatibility
  if (env.isServer) {
    const serverSiteId = process.env.SPOOL_SITE_ID;
    if (serverSiteId) {
      return serverSiteId;
    }
  }
  
  throw new Error(
    `Spool site ID not found. Please set NEXT_PUBLIC_SPOOL_SITE_ID environment variable or pass siteId in config.`
  );
}

/**
 * Resolve base URL with smart defaults
 */
function resolveBaseUrl(configBaseUrl?: string, environment?: EnvironmentContext): string {
  const env = environment || detectEnvironment();
  
  // Try config first
  if (configBaseUrl) {
    return configBaseUrl;
  }
  
  // Try environment variables (for backward compatibility)
  const envBaseUrl = process.env.SPOOL_BASE_URL || process.env.SPOOL_API_BASE;
  if (envBaseUrl) {
    return envBaseUrl;
  }
  
  // Default to production Spool CMS
  return 'https://www.spoolcms.com';
}

/**
 * Validate that all required configuration is present
 */
function validateConfig(config: { apiKey: string; siteId: string; baseUrl: string }): void {
  if (!config.apiKey) {
    throw new Error('Spool API key is required');
  }
  
  if (!config.siteId) {
    throw new Error('Spool site ID is required');
  }
  
  if (!config.baseUrl) {
    throw new Error('Spool base URL is required');
  }
  
  // Validate API key format
  if (!config.apiKey.startsWith('spool_')) {
    console.warn('Spool API key should start with "spool_" prefix');
  }
  
  // Validate site ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(config.siteId)) {
    console.warn('Spool site ID should be a valid UUID');
  }
}

/**
 * Create a configuration object for testing purposes
 */
export function createTestConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
  return {
    apiKey: 'spool_test_key',
    siteId: '00000000-0000-0000-0000-000000000000',
    baseUrl: 'https://test.spoolcms.com',
    environment: detectEnvironment(),
    ...overrides,
  };
}