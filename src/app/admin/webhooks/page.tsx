'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useSite } from '@/context/SiteContext';
import { useAdminHeader } from '@/context/AdminHeaderContext';
import { getWebhookDeliveries } from '@/lib/webhooks';

interface WebhookDelivery {
  id: string;
  site_id: string;
  webhook_url: string;
  payload: {
    event: string;
    collection: string;
    slug?: string;
    item_id: string;
    timestamp: string;
  };
  status: 'pending' | 'success' | 'failed';
  response_status?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  created_at: string;
  delivered_at?: string;
}

export default function WebhooksPage() {
  const { currentSite } = useSite();
  const { setTitle, setBreadcrumbs } = useAdminHeader();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTitle('Webhook Deliveries');
    setBreadcrumbs([
      { label: 'Admin', href: '/admin' },
      { label: 'Webhook Deliveries', href: '/admin/webhooks' },
    ]);
  }, [setTitle, setBreadcrumbs]);

  const loadDeliveries = async () => {
    if (!currentSite) return;

    try {
      setIsLoading(true);
      
      // Create supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const deliveriesData = await getWebhookDeliveries(supabase, currentSite.id);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error('Error loading webhook deliveries:', error);
      toast.error('Failed to load webhook deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, [currentSite]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!currentSite) {
    return (
      <div className="p-6 bg-white min-h-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No site selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Webhook Deliveries</h1>
            <p className="text-muted-foreground">
              Monitor webhook delivery status and debug issues
            </p>
          </div>
          <Button onClick={loadDeliveries} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading webhook deliveries...
              </div>
            </CardContent>
          </Card>
        ) : deliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No webhook deliveries yet</h3>
                <p className="text-muted-foreground mb-4">
                  Webhook deliveries will appear here when content is created, updated, or deleted.
                </p>
                <Button variant="outline" asChild>
                  <a href="/admin/settings">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configure Webhooks
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(delivery.status)}
                      <div>
                        <CardTitle className="text-base">
                          {delivery.payload.event} - {delivery.payload.collection}
                        </CardTitle>
                        <CardDescription>
                          {delivery.payload.slug && `Slug: ${delivery.payload.slug} • `}
                          ID: {delivery.payload.item_id}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(delivery.status)}
                      {delivery.response_status && (
                        <Badge variant="outline">
                          HTTP {delivery.response_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Webhook URL</p>
                      <p className="font-mono text-xs break-all">{delivery.webhook_url}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Timestamp</p>
                      <p>{formatTimestamp(delivery.created_at)}</p>
                      {delivery.delivered_at && (
                        <p className="text-xs text-muted-foreground">
                          Delivered: {formatTimestamp(delivery.delivered_at)}
                        </p>
                      )}
                    </div>
                    {delivery.error_message && (
                      <div className="md:col-span-2">
                        <p className="font-medium text-muted-foreground">Error Message</p>
                        <p className="text-red-600 font-mono text-xs">{delivery.error_message}</p>
                      </div>
                    )}
                    {delivery.response_body && (
                      <div className="md:col-span-2">
                        <p className="font-medium text-muted-foreground">Response Body</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {delivery.response_body}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}