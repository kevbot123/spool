'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Save, RefreshCw, Globe, Key, Trash2, TestTube, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSite } from '@/context/SiteContext';
import { useAdminHeader } from '@/context/AdminHeaderContext';
import { generateWebhookSecret, testWebhook } from '@/lib/webhooks';

interface SiteSettings {
  id: string;
  name: string;
  domain: string | null;
  subdomain: string | null;
  api_key: string;
  settings: {
    webhook_url?: string;
    webhook_secret?: string;
    social_links?: {
      twitter?: string;
      facebook?: string;
      linkedin?: string;
      instagram?: string;
    };
    seo?: {
      default_title?: string;
      default_description?: string;
      default_og_image?: string;
    };
  };
}

export default function SiteSettingsPage() {
  const { currentSite, refreshSites } = useSite();
  const { setHeaderContent, setBreadcrumbs } = useAdminHeader();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultOgImage, setDefaultOgImage] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  console.log('SiteSettingsPage render:', {
    isLoading,
    isSaving,
    currentSite: !!currentSite,
    settings: !!settings,
  });

  // Set up header content
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Site Settings', href: '/admin/settings' }
    ]);

    setHeaderContent(
      <div className="flex items-center justify-between w-full">
        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading || !currentSite || !settings}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    );

    return () => {
      setHeaderContent(null);
      setBreadcrumbs([]);
    };
  }, [currentSite, setHeaderContent, setBreadcrumbs, isSaving, isLoading, settings]);

  // Fetch site settings
  useEffect(() => {
    if (!currentSite) return;

    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching settings for site:', currentSite.id);
        
        const response = await fetch(`/api/admin/sites/${currentSite.id}/settings`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch site settings');
        }

        const data = await response.json();
        console.log('Received settings:', data);
        
        setSettings(data);
        
        // Populate form fields
        setName(data.name || '');
        setDomain(data.domain || '');
        setWebhookUrl(data.settings?.webhook_url || '');
        setWebhookSecret(data.settings?.webhook_secret || '');
        setDefaultTitle(data.settings?.seo?.default_title || '');
        setDefaultDescription(data.settings?.seo?.default_description || '');
        setDefaultOgImage(data.settings?.seo?.default_og_image || '');
        setTwitterUrl(data.settings?.social_links?.twitter || '');
        setFacebookUrl(data.settings?.social_links?.facebook || '');
        setLinkedinUrl(data.settings?.social_links?.linkedin || '');
        setInstagramUrl(data.settings?.social_links?.instagram || '');

        console.log('Form fields populated');
      } catch (error) {
        console.error('Error fetching site settings:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load site settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [currentSite]);

  const handleSave = useCallback(async () => {
    if (!currentSite || !settings) {
      toast.error('Unable to save: site data not loaded');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting save for site:', currentSite.id);

      const updatedSettings = {
        name,
        domain: domain || null,
        settings: {
          ...settings.settings, // Preserve other settings
          webhook_url: webhookUrl || undefined,
          webhook_secret: webhookSecret || undefined,
          social_links: {
            twitter: twitterUrl || undefined,
            facebook: facebookUrl || undefined,
            linkedin: linkedinUrl || undefined,
            instagram: instagramUrl || undefined,
          },
          seo: {
            default_title: defaultTitle || undefined,
            default_description: defaultDescription || undefined,
            default_og_image: defaultOgImage || undefined,
          },
        },
      };

      console.log('Sending updated settings:', updatedSettings);

      const response = await fetch(`/api/admin/sites/${currentSite.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save site settings');
      }

      console.log('Save successful, received:', responseData);
      
      setSettings(responseData);
      await refreshSites();
      
      toast.success('Site settings saved successfully');
    } catch (error) {
      console.error('Error saving site settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save site settings');
    } finally {
      setIsSaving(false);
    }
  }, [
    currentSite,
    settings,
    name,
    domain,
    webhookUrl,
    webhookSecret,
    defaultTitle,
    defaultDescription,
    defaultOgImage,
    twitterUrl,
    facebookUrl,
    linkedinUrl,
    instagramUrl,
    refreshSites,
  ]);

  const handleGenerateWebhookSecret = useCallback(() => {
    const newSecret = generateWebhookSecret();
    setWebhookSecret(newSecret);
    toast.success('New webhook secret generated');
  }, []);

  const handleTestWebhook = useCallback(async () => {
    if (!currentSite) {
      toast.error('No site selected');
      return;
    }

    if (!webhookUrl) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    try {
      setIsTestingWebhook(true);
      
      // We need to create a supabase client here
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const result = await testWebhook(supabase, currentSite.id);
      
      if (result.success) {
        toast.success('Webhook test successful! Check your endpoint logs.');
      } else {
        toast.error(`Webhook test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setIsTestingWebhook(false);
    }
  }, [currentSite, webhookUrl]);

  const handleDeleteSite = async () => {
    if (!currentSite) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/sites/${currentSite.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete site');
      }
      await refreshSites();
      toast.success('Site deleted');
      if (data.remainingSiteCount === 0) {
        localStorage.removeItem('selectedSiteId');
        router.push('/setup');
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete site');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!currentSite || !settings) return;

    try {
      setIsRegenerating(true);

      const response = await fetch(`/api/admin/sites/${currentSite.id}/regenerate-api-key`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate API key');
      }

      const data = await response.json();
      setSettings(prev => prev ? { ...prev, api_key: data.api_key } : null);
      
      toast.success('API key regenerated successfully');
    } catch (error) {
      console.error('Error regenerating API key:', error);
      toast.error('Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="p-6 pt-2 bg-white min-h-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSite || !settings) {
    return (
      <div className="p-6 pt-2 bg-white min-h-full">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertDescription>
              No site selected or failed to load site settings.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Basic Settings */}
        <Card className="py-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Basic Settings
            </CardTitle>
            <CardDescription>
              Configure your site's basic information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Site"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="https://mysite.com"
                  type="url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Settings */}
        <Card className="py-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Instant Updates
            </CardTitle>
            <CardDescription>
              Configure webhook URL for real-time content updates in your Next.js app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yoursite.com/api/webhooks/spool"
                  type="url"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={!webhookUrl || isTestingWebhook}
                  className="shrink-0"
                >
                  {isTestingWebhook ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  Test
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This URL will be called whenever content is updated, allowing your Next.js site to revalidate pages instantly.
                Create the webhook endpoint at <code className="bg-muted px-1 rounded">app/api/webhooks/spool/route.ts</code> in your Next.js project.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="webhook-secret"
                    type={showWebhookSecret ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Generate a secure secret for webhook verification"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateWebhookSecret}
                  className="shrink-0"
                >
                  <Key className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                A secure secret used to verify webhook authenticity. Keep this secret safe and use it in your webhook endpoint to verify requests are from Spool.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SEO Settings */}
        <Card className="py-6">
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>
              Configure default SEO metadata for your site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-title">Default Title</Label>
              <Input
                id="default-title"
                value={defaultTitle}
                onChange={(e) => setDefaultTitle(e.target.value)}
                placeholder="My Site | Welcome"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-description">Default Description</Label>
              <Textarea
                id="default-description"
                value={defaultDescription}
                onChange={(e) => setDefaultDescription(e.target.value)}
                placeholder="A brief description for search engines..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-og-image">Default Open Graph Image</Label>
              <Input
                id="default-og-image"
                value={defaultOgImage}
                onChange={(e) => setDefaultOgImage(e.target.value)}
                placeholder="https://mysite.com/og-image.png"
                type="url"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="py-6">
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>
              Add links to your social media profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter/X</Label>
                <Input
                  id="twitter"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/username"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/page"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/name"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/username"
                  type="url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="py-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Your site's API key for connecting to external applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Site ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={settings.id}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(settings.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label>API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={settings.api_key}
                  readOnly
                  type="password"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(settings.api_key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerateApiKey}
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Keep this key secure. Regenerating will invalidate the old key.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="py-6 border border-red-600">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600">
              Deleting a site is permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DestructiveActionDialog
              trigger={
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Site
                </Button>
              }
              title={`Delete site "${settings.name}"?`}
              description="This will permanently delete the site and all of its data. Type the phrase 'delete forever' to confirm."
              confirmInputText="delete forever"
              confirmText="Delete"
              onConfirm={handleDeleteSite}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}