'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/context/SiteContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Copy, ExternalLink, ArrowLeft } from 'lucide-react';

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
  const router = useRouter();
  const { refreshSites, sites, setCurrentSite } = useSite();

  const isFirstSite = sites.length === 0;

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

      // Refresh sites context so SetupGuard can redirect to admin
      await refreshSites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    if (site) {
      // Find the newly created site in the sites list and switch to it
      const newSite = sites.find(s => s.id === site.id);
      if (newSite) {
        setCurrentSite(newSite);
      }
    }
    // Redirect to admin panel
    router.push('/admin');
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
      <div className="min-h-screen bg-white">
        {!isFirstSite && (
          <div className="absolute top-6 left-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center p-6 min-h-screen">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-14">
              <h1 className="text-3xl font-bold mb-3">
                {isFirstSite ? 'Welcome to Spool CMS' : 'Add New Site'}
              </h1>
              <p className="text-xl text-gray-600">
                {isFirstSite
                  ? "Let's set up your site in just a few steps."
                  : "Add another site to your Spool CMS workspace."
                }
              </p>
            </div>

            <Card className="py-6">
              {/* <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>
                  Tell us about your Next.js site to get started.
                </CardDescription>
              </CardHeader> */}
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="pb-2">Site Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="My Next.js Blog"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="domain" className="pb-2">Domain (optional)</Label>
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

                  <div className="space-y-3">
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Setting up...' : 'Create Site'}
                    </Button>

                    {isFirstSite && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          setError('');

                          try {
                            const response = await fetch('/api/sites/setup', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                name: 'My Site',
                                domain: ''
                              }),
                            });

                            const data = await response.json();

                            if (!response.ok) {
                              throw new Error(data.error || 'Failed to setup site');
                            }

                            // Refresh sites context and redirect to admin
                            await refreshSites();
                            router.push('/admin');
                          } catch (err: any) {
                            setError(err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Skip setup for now
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2 && site) {
    return (
      <div className="min-h-screen bg-white">
        {!isFirstSite && (
          <div className="absolute top-6 left-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </div>
        )}

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 mt-16">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <h1 className="text-3xl font-bold">Site Created Successfully!</h1>
              </div>
              <p className="text-xl text-gray-600 mb-6">
                Follow these steps to integrate Spool CMS with your Next.js application.
              </p>

              {/* You're All Set! Card - Moved to top */}
              <Card className="bg-green-50 border-green-200 py-5 mb-8">
                <CardHeader>
                  <CardTitle className="text-green-800">🚀 You're All Set!</CardTitle>
                  <CardDescription className="text-green-700">
                    Your site is now connected to Spool CMS. Ready to start managing your content?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button onClick={handleFinishSetup} className="bg-green-600 hover:bg-green-700">
                      Go to Admin Panel
                    </Button>
                    {site.domain && (
                      <Button asChild variant="outline">
                        <a href={site.domain} target="_blank" className="flex items-center gap-2">
                          View Site
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Step 1: Install Package */}
              <Card className="py-5">
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
              <Card className="py-5">
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
                    {`# Spool CMS credentials (required)
SPOOL_API_KEY="${site.apiKey}"
SPOOL_SITE_ID="${site.id}"

# Your site URL (required for production) - used for SEO and metadata generation
NEXT_PUBLIC_SITE_URL="${site.domain || 'https://yoursite.com'}"`}
                  </CodeBlock>
                </CardContent>
              </Card>

              {/* Step 3: API Route */}
              <Card className="py-5">
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
  siteId: process.env.SPOOL_SITE_ID!,
});`}
                  </CodeBlock>
                </CardContent>
              </Card>

              {/* Step 4: Shared Config */}
              <Card className="py-5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                    Create Shared Config
                  </CardTitle>
                  <CardDescription>
                    Create this file: lib/spool.ts (recommended)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock>
                    {`import { SpoolConfig } from '@spoolcms/nextjs/types';

export const spoolConfig: SpoolConfig = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
};`}
                  </CodeBlock>
                </CardContent>
              </Card>

              {/* Step 5: Usage Example */}
              <Card className="py-5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                    Use in Your Components
                  </CardTitle>
                  <CardDescription>
                    Example of fetching content in your Next.js pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock>
                    {`import { getSpoolContent } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

export default async function BlogPost({ params }) {
  // Fetch single post with HTML rendering
  const post = await getSpoolContent(spoolConfig, 'blog', params.slug, { renderHtml: true });

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      {post.body_html && (
        <div dangerouslySetInnerHTML={{ __html: post.body_html }} />
      )}
    </article>
  );
}`}
                  </CodeBlock>
                </CardContent>
              </Card>

              {/* Step 6: SEO Setup */}
              <Card className="py-5 mb-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">6</span>
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
import { spoolConfig } from '@/lib/spool';

export async function GET() {
  const sitemap = await getSpoolSitemap(spoolConfig);
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}`}
                      </CodeBlock>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">app/robots.txt/route.ts</h4>
                      <CodeBlock>
                        {`import { getSpoolRobots } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

export async function GET() {
  const robots = await getSpoolRobots(spoolConfig);
  
  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}`}
                      </CodeBlock>
                    </div>
                  </div>
                </CardContent>
              </Card>


            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}