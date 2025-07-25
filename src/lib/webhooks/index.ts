/**
 * Webhook utilities for calling external URLs when content changes
 */

interface WebhookPayload {
  event: 'content.updated' | 'content.created' | 'content.deleted' | 'content.published';
  site_id: string;
  collection: string;
  slug?: string;
  item_id: string;
  timestamp: string;
}

/**
 * Call a webhook URL with the given payload
 */
export async function callWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  try {
    console.log(`Calling webhook: ${webhookUrl}`, payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Spool-CMS-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Webhook call failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Webhook call successful: ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error(`Webhook call error for ${webhookUrl}:`, error);
    return false;
  }
}

/**
 * Get the webhook URL for a site
 */
export async function getWebhookUrl(supabase: any, siteId: string): Promise<string | null> {
  try {
    const { data: site, error } = await supabase
      .from('sites')
      .select('settings')
      .eq('id', siteId)
      .single();

    if (error || !site) {
      console.error('Error fetching site for webhook:', error);
      return null;
    }

    return site.settings?.webhook_url || null;
  } catch (error) {
    console.error('Error getting webhook URL:', error);
    return null;
  }
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
    const webhookUrl = await getWebhookUrl(supabase, siteId);
    
    if (!webhookUrl) {
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
    callWebhook(webhookUrl, payload).catch(error => {
      console.error('Webhook call failed:', error);
    });
  } catch (error) {
    console.error('Error triggering webhook:', error);
  }
}