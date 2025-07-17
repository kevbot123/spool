'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Copy, ExternalLink } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  setupInstructions: {
    step1: string;
    step2: string;
    step3: string;
    apiRoute: string;
  };
}

export default function SetupPage() {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sites/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup site');
      }

      setSite(data.site);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const CodeBlock = ({ children, title }: { children: string; title?: string }) => (
    <div className="relative">
      {title && (
        <div className="text-sm text-gray-500 mb-2">{title}</div>
      )}
      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
        <pre className="text-sm overflow-x-auto">
          <code>{children}</code>
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={() => copyToClipboard(children)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Connect Your Next.js Site</h1>
          <p className="text-gray-600">
            Set up Spool CMS for your Next.js application in just a few steps.
          </p>
        </div>

        <Card className="py-6">
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
            <CardDescription>
              Tell us about your Next.js site to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Next.js Blog"
                  required
                />
              </div>

              <div>
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="https://myblog.com"
                  type="url"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Used for automatic revalidation when content is published
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Setting up...' : 'Create Site'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2 && site) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h1 className="text-3xl font-bold">Site Created Successfully!</h1>
          </div>
          <p className="text-gray-600">
            Follow these steps to integrate Spool CMS with your Next.js application.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Install Package */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Install the Spool Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock>npm install @spoolcms/nextjs</CodeBlock>
            </CardContent>
          </Card>

          {/* Step 2: Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Add Environment Variables
              </CardTitle>
              <CardDescription>
                Add these to your .env.local file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock>
{`SPOOL_API_KEY=${site.apiKey}
SPOOL_SITE_ID=${site.id}`}
              </CodeBlock>
            </CardContent>
          </Card>

          {/* Step 3: API Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Create API Route
              </CardTitle>
              <CardDescription>
                Create this file: app/api/spool/[...route]/route.ts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock>
{`import { createSpoolHandler } from '@spoolcms/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
});`}
              </CodeBlock>
            </CardContent>
          </Card>

          {/* Step 4: Usage Example */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                Use in Your Components
              </CardTitle>
              <CardDescription>
                Example of fetching content in your Next.js pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock>
{`import { getSpoolContent } from '@spoolcms/nextjs';

export default async function BlogPost({ params }) {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };

  const { item } = await getSpoolContent(config, 'blog', params.slug);

  return (
    <article>
      <h1>{item.data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: item.data.body }} />
    </article>
  );
}`}
              </CodeBlock>
            </CardContent>
          </Card>

          {/* Step 5: SEO Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                Add SEO Support (Optional)
              </CardTitle>
              <CardDescription>
                Get automatic sitemaps, robots.txt, and meta tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">app/sitemap.xml/route.ts</h4>
                  <CodeBlock>
{`import { getSpoolSitemap } from '@spoolcms/nextjs';

export async function GET() {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };

  const sitemap = await getSpoolSitemap(config);
  
  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' }
  });
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-medium mb-2">app/robots.txt/route.ts</h4>
                  <CodeBlock>
{`import { getSpoolRobots } from '@spoolcms/nextjs';

export async function GET() {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };

  const robots = await getSpoolRobots(config);
  
  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain' }
  });
}`}
                  </CodeBlock>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 You're All Set!</CardTitle>
              <CardDescription>
                Your site is now connected to Spool CMS. Here's what you can do next:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm">
                    <a href="/admin/collections" className="flex items-center gap-2">
                      Create Collections
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <span className="text-gray-600">Set up your content structure</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm">
                    <a href="/admin" className="flex items-center gap-2">
                      Manage Content
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <span className="text-gray-600">Start creating and editing content</span>
                </div>
                
                {site.domain && (
                  <div className="flex items-center gap-3">
                    <Button asChild variant="outline" size="sm">
                      <a href={site.domain} target="_blank" className="flex items-center gap-2">
                        View Site
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <span className="text-gray-600">See your content live</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
} 