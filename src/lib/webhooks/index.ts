/**
 * Webhook utilities for calling external URLs when content changes
 */

import crypto from 'crypto';

interface WebhookPayload {
  event: 'content.updated' | 'content.created' | 'content.deleted' | 'content.published';
  site_id: string;
  collection: string;
  slug?: string;
  item_id: string;
  timestamp: string;
}

interface WebhookDelivery {
  id: string;
  site_id: string;
  webhook_url: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed';
  response_status?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  created_at: string;
  delivered_at?: string;
}

/**
 * Generate webhook signature for verification
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Generate a webhook secret for a site
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Call a webhook URL with the given payload and log the delivery
 */
export async function callWebhook(
  supabase: any,
  webhookUrl: string, 
  payload: WebhookPayload,
  webhookSecret?: string
): Promise<boolean> {
  const deliveryId = crypto.randomUUID();
  const payloadString = JSON.stringify(payload);
  
  // Create delivery record
  const delivery: Partial<WebhookDelivery> = {
    id: deliveryId,
    site_id: payload.site_id,
    webhook_url: webhookUrl,
    payload,
    status: 'pending',
    attempts: 1,
    created_at: new Date().toISOString(),
  };

  try {
    console.log(`Calling webhook: ${webhookUrl}`, payload);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Spool-CMS-Webhook/1.0',
      'X-Spool-Delivery': deliveryId,
      'X-Spool-Event': payload.event,
    };

    // Add signature if webhook secret is provided
    if (webhookSecret) {
      const signature = generateWebhookSignature(payloadString, webhookSecret);
      headers['X-Spool-Signature-256'] = `sha256=${signature}`;
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseBody = await response.text().catch(() => '');

    if (!response.ok) {
      console.error(`Webhook call failed: ${response.status} ${response.statusText}`);
      
      // Log failed delivery
      await supabase.from('webhook_deliveries').insert({
        ...delivery,
        status: 'failed',
        response_status: response.status,
        response_body: responseBody.slice(0, 1000), // Limit response body size
        error_message: `HTTP ${response.status}: ${response.statusText}`,
      }).catch(console.error);
      
      return false;
    }

    console.log(`Webhook call successful: ${webhookUrl}`);
    
    // Log successful delivery
    await supabase.from('webhook_deliveries').insert({
      ...delivery,
      status: 'success',
      response_status: response.status,
      response_body: responseBody.slice(0, 1000),
      delivered_at: new Date().toISOString(),
    }).catch(console.error);
    
    return true;
  } catch (error) {
    console.error(`Webhook call error for ${webhookUrl}:`, error);
    
    // Log failed delivery
    await supabase.from('webhook_deliveries').insert({
      ...delivery,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    }).catch(console.error);
    
    return false;
  }
}

/**
 * Get the webhook configuration for a site
 */
export async function getWebhookConfig(supabase: any, siteId: string): Promise<{
  url: string | null;
  secret: string | null;
}> {
  try {
    const { data: site, error } = await supabase
      .from('sites')
      .select('settings')
      .eq('id', siteId)
      .single();

    if (error || !site) {
      console.error('Error fetching site for webhook:', error);
      return { url: null, secret: null };
    }

    return {
      url: site.settings?.webhook_url || null,
      secret: site.settings?.webhook_secret || null,
    };
  } catch (error) {
    console.error('Error getting webhook config:', error);
    return { url: null, secret: null };
  }
}

/**
 * Get the webhook URL for a site (backward compatibility)
 */
export async function getWebhookUrl(supabase: any, siteId: string): Promise<string | null> {
  const config = await getWebhookConfig(supabase, siteId);
  return config.url;
}

/**
 * Trigger webhook for content changes
 */
export async function triggerContentWebhook(
  supabase: any,
  event: WebhookPayload['event'],
  siteId: string,
  collection: string,
  itemId: string,
  slug?: string
): Promise<void> {
  try {
    const webhookConfig = await getWebhookConfig(supabase, siteId);
    
    if (!webhookConfig.url) {
      console.log(`No webhook URL configured for site ${siteId}`);
      return;
    }

    const payload: WebhookPayload = {
      event,
      site_id: siteId,
      collection,
      slug,
      item_id: itemId,
      timestamp: new Date().toISOString(),
    };

    // Call webhook asynchronously - don't wait for response
    callWebhook(supabase, webhookConfig.url, payload, webhookConfig.secret).catch(error => {
      console.error('Webhook call failed:', error);
    });
  } catch (error) {
    console.error('Error triggering webhook:', error);
  }
}

/**
 * Test webhook connectivity
 */
export async function testWebhook(supabase: any, siteId: string): Promise<{
  success: boolean;
  error?: string;
  deliveryId?: string;
}> {
  try {
    const webhookConfig = await getWebhookConfig(supabase, siteId);
    
    if (!webhookConfig.url) {
      return { success: false, error: 'No webhook URL configured' };
    }

    const testPayload: WebhookPayload = {
      event: 'content.updated',
      site_id: siteId,
      collection: 'test',
      item_id: 'test-webhook',
      timestamp: new Date().toISOString(),
    };

    const success = await callWebhook(supabase, webhookConfig.url, testPayload, webhookConfig.secret);
    
    return { 
      success,
      error: success ? undefined : 'Webhook call failed - check delivery logs for details'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get webhook delivery logs for a site
 */
export async function getWebhookDeliveries(
  supabase: any, 
  siteId: string, 
  limit: number = 50
): Promise<WebhookDelivery[]> {
  try {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook deliveries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting webhook deliveries:', error);
    return [];
  }
}

/**
 * Verify webhook signature (for use in Next.js webhook endpoints)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = `sha256=${generateWebhookSignature(payload, secret)}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}