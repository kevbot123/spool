"use client"

/**
 * Client-side IP location utilities for the analytics dashboard
 */

// Import the shared IP location functions and interface
import { getCountryForIP, batchGetCountryForIPs, type IPLocation } from '../../../lib/ip-location';

/**
 * Processes an array of IP addresses, resolving them to country data using batch processing.
 * Aggregates the results to provide counts per country.
 * @param ipAddresses Array of IP addresses.
 * @returns Promise resolving to an array of { countryCode, countryName, count } objects.
 */
export async function processIPLocations(ipAddresses: string[]): Promise<{ countryCode: string | null; countryName: string; count: number }[]> {
  console.log('[processIPLocations] Starting batch processing for', ipAddresses.length, 'IPs');
  if (!ipAddresses || ipAddresses.length === 0) {
    return [];
  }

  const uniqueIPs = Array.from(new Set(ipAddresses.filter(ip => ip && ip !== 'unknown')));
  console.log('[processIPLocations] Filtered to', uniqueIPs.length, 'unique valid IPs');

  if (uniqueIPs.length === 0) {
    return [];
  }

  try {
    // Use the new batch processing function for better performance
    const batchSize = Math.min(5, uniqueIPs.length); // Use smaller batches for analytics
    console.log('[processIPLocations] Starting batch processing with size:', batchSize);
    const ipLocationResults = await batchGetCountryForIPs(uniqueIPs, batchSize);
    
    console.log('[processIPLocations] Batch processing completed, got results for', ipLocationResults.size, 'out of', uniqueIPs.length, 'IPs');

    // Debug: Log each result
    ipLocationResults.forEach((result, ip) => {
      console.log(`[processIPLocations] IP ${ip}: ${result.country} (${result.countryCode})`);
    });

    // Aggregate results based on the original list to get correct counts
    const aggregatedData: Record<string, { countryCode: string | null; countryName: string; count: number }> = {};

    ipAddresses.forEach(ip => {
      if (!ip || ip === 'unknown') return; // Skip invalid IPs in the original list

      const location = ipLocationResults.get(ip);
      if (location && location.countryCode && location.countryCode !== 'XX') {
        // Use country name as the primary key for aggregation
        const key = location.country || 'Unknown';
        if (!aggregatedData[key]) {
          aggregatedData[key] = {
            countryCode: location.countryCode,
            countryName: key,
            count: 0
          };
        }
        aggregatedData[key].count++;
      } else {
        // Handle unknown/error cases
        const key = 'Unknown/Error';
        if (!aggregatedData[key]) {
          aggregatedData[key] = { 
            countryCode: null, 
            countryName: key, 
            count: 0 
          };
        }
        aggregatedData[key].count++;
      }
    });

    console.log('[processIPLocations] Final aggregated data:', Object.keys(aggregatedData).length, 'countries');
    Object.entries(aggregatedData).forEach(([country, data]) => {
      console.log(`[processIPLocations] ${country}: ${data.count} chats`);
    });
    
    // Sort by count (highest first) and return
    return Object.values(aggregatedData).sort((a, b) => b.count - a.count);

  } catch (error) {
    console.error('[processIPLocations] Error in batch processing:', error);
    
    // Fallback to individual processing if batch fails
    console.log('[processIPLocations] Falling back to individual processing...');
    const locationPromises = uniqueIPs.slice(0, 10).map(async (ip) => { // Limit to 10 for fallback
      try {
        const location = await getCountryForIP(ip);
        return { ip, ...location };
      } catch (error) {
        console.error(`[processIPLocations] Error fetching location for IP ${ip}:`, error);
        return { ip, countryCode: 'XX', country: 'Error', city: 'Error' };
      }
    });

    const ipLocationResults = await Promise.all(locationPromises);

    // Create a map from IP to its resolved location
    const ipToLocationMap: Record<string, IPLocation> = {};
    ipLocationResults.forEach(result => {
      if (result && result.countryCode !== 'XX') {
        ipToLocationMap[result.ip] = {
          countryCode: result.countryCode,
          country: result.country,
          city: result.city
        };
      }
    });

    // Aggregate results based on the original list to get correct counts
    const aggregatedData: Record<string, { countryCode: string | null; countryName: string; count: number }> = {};

    ipAddresses.forEach(ip => {
      if (!ip || ip === 'unknown') return;

      const location = ipToLocationMap[ip];
      if (location && location.countryCode && location.countryCode !== 'XX') {
        const key = location.country || 'Unknown';
        if (!aggregatedData[key]) {
          aggregatedData[key] = {
            countryCode: location.countryCode,
            countryName: key,
            count: 0
          };
        }
        aggregatedData[key].count++;
      } else {
        const key = 'Unknown/Error';
        if (!aggregatedData[key]) {
          aggregatedData[key] = { countryCode: null, countryName: key, count: 0 };
        }
        aggregatedData[key].count++;
      }
    });

    return Object.values(aggregatedData).sort((a, b) => b.count - a.count);
  }
}
