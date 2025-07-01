import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  ExternalLink, 
  Code2, 
  Database, 
  Globe, 
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo Setup Guide - Spool CMS',
  description: 'Learn how to set up and test the Spool CMS demo blog. Create collections, add content, and test all features locally.',
  robots: 'noindex,nofollow' // This is a demo setup page
};

export default function DemoSetupPage() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Demo Setup Guide
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Test the Complete CMS Experience
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            This guide will help you set up the demo blog to test all Spool CMS features including 
            content creation, real-time editing, SEO optimization, and API integration.
          </p>
        </div>

        <Alert className="mb-8">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This demo uses mock data by default. Follow the steps below to connect it to a real Spool CMS instance 
            for full testing capabilities.
          </AlertDescription>
        </Alert>

        {/* Setup Steps */}
        <div className="space-y-8">
          {/* Step 1: Create Blog Collection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Create the Blog Collection
                  </CardTitle>
                  <CardDescription>
                    Set up the content structure for blog posts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                First, create a blog collection in the CMS admin with the following schema:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Collection Configuration:</h4>
                <ul className="space-y-2 text-sm">
                  <li><strong>Name:</strong> Blog Posts</li>
                  <li><strong>Slug:</strong> blog</li>
                  <li><strong>URL Pattern:</strong> /blog/[slug]</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Required Fields:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">title</div>
                    <div className="text-gray-600">Text • Required</div>
                  </div>
                  <div>
                    <div className="font-medium">excerpt</div>
                    <div className="text-gray-600">Text • Required</div>
                  </div>
                  <div>
                    <div className="font-medium">body</div>
                    <div className="text-gray-600">Markdown • Required</div>
                  </div>
                  <div>
                    <div className="font-medium">author</div>
                    <div className="text-gray-600">Text • Required</div>
                  </div>
                  <div>
                    <div className="font-medium">tags</div>
                    <div className="text-gray-600">Multi-select • Optional</div>
                  </div>
                  <div>
                    <div className="font-medium">publishedAt</div>
                    <div className="text-gray-600">DateTime • Required</div>
                  </div>
                  <div>
                    <div className="font-medium">featured</div>
                    <div className="text-gray-600">Boolean • Optional</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Link href="/admin/collections">
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Collections Admin
                  </Button>
                </Link>
                <Button variant="outline" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Auto-setup (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Create Sample Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Create Sample Blog Posts
                  </CardTitle>
                  <CardDescription>
                    Add content to test the blog functionality
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Create a few blog posts to test the complete workflow:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Sample Post Ideas:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• "Getting Started with Spool CMS"</li>
                    <li>• "Real-time Editing Features"</li>
                    <li>• "SEO Best Practices"</li>
                    <li>• "Building Dynamic Pages"</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Test Different States:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Draft posts</li>
                    <li>• Published posts</li>
                    <li>• Featured content</li>
                    <li>• Various tags and authors</li>
                  </ul>
                </div>
              </div>

              <Link href="/admin">
                <Button>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Content Editor
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Step 3: Configure Environment */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Connect Real API (Optional)
                  </CardTitle>
                  <CardDescription>
                    Connect the demo to your actual Spool instance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To test with real data, update your environment variables:
              </p>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">{`# .env.local
SPOOL_API_KEY=your_actual_api_key
SPOOL_SITE_ID=your_actual_site_id
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> The demo currently uses mock data. To connect to a real Spool instance, 
                  you'll need to update the API functions in the demo blog pages to use the actual 
                  getSpoolContent functions instead of the mock data.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Test Features */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Test All Features
                  </CardTitle>
                  <CardDescription>
                    Verify the complete CMS functionality
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Content Management:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Create and edit blog posts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Test draft and publish workflow
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Real-time auto-save
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Rich markdown editing
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Frontend Integration:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Dynamic page generation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      SEO meta tags
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Sitemap generation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Automatic revalidation
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo Blog</CardTitle>
              <CardDescription>See the blog in action</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/demo/blog">
                <Button className="w-full">
                  Visit Demo Blog
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CMS Admin</CardTitle>
              <CardDescription>Manage your content</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button variant="outline" className="w-full">
                  Open Admin
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Guide</CardTitle>
              <CardDescription>Learn how it works</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/demo/spool-integration">
                <Button variant="outline" className="w-full">
                  View Docs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 