'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Twitter, Facebook, Linkedin } from 'lucide-react';

interface SEOPreviewProps {
  title: string;
  seoTitle?: string;
  description?: string;
  seoDescription?: string;
  ogImage?: string;
  slug: string;
  domain?: string;
}

export function SEOPreview({
  title,
  seoTitle,
  description,
  seoDescription,
  ogImage,
  slug,
  domain = 'mysite.com'
}: SEOPreviewProps) {
  const [activeTab, setActiveTab] = useState('google');

  const displayTitle = seoTitle || title;
  const displayDescription = seoDescription || description || '';
  const url = `${domain}/${slug}`;
  const displayImage = ogImage || '/api/og?title=' + encodeURIComponent(displayTitle);

  // SEO Health Checks
  const titleLength = displayTitle.length;
  const descriptionLength = displayDescription.length;
  
  const seoHealth = {
    title: {
      status: titleLength >= 30 && titleLength <= 60 ? 'good' : titleLength < 30 ? 'warning' : 'error',
      message: titleLength >= 30 && titleLength <= 60 
        ? 'Perfect length' 
        : titleLength < 30 
          ? 'Too short (30-60 recommended)' 
          : 'Too long (30-60 recommended)'
    },
    description: {
      status: descriptionLength >= 120 && descriptionLength <= 160 ? 'good' : descriptionLength < 120 ? 'warning' : 'error',
      message: descriptionLength >= 120 && descriptionLength <= 160 
        ? 'Perfect length' 
        : descriptionLength < 120 
          ? 'Too short (120-160 recommended)' 
          : 'Too long (120-160 recommended)'
    }
  };

  const GooglePreview = () => (
    <div className="border rounded-lg p-4 bg-white">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Search className="h-4 w-4" />
          <span>{url}</span>
        </div>
        <h3 className="text-blue-600 text-lg hover:underline cursor-pointer leading-tight">
          {displayTitle}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {displayDescription}
        </p>
      </div>
    </div>
  );

  const TwitterPreview = () => (
    <div className="border rounded-lg overflow-hidden bg-white max-w-lg">
      {displayImage && (
        <div className="aspect-video bg-gray-100 relative">
          <img 
            src={displayImage} 
            alt={displayTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="text-gray-500 text-sm mb-1">{domain}</div>
        <h4 className="font-semibold text-gray-900 leading-tight mb-1">
          {displayTitle}
        </h4>
        <p className="text-gray-600 text-sm leading-relaxed">
          {displayDescription}
        </p>
      </div>
    </div>
  );

  const FacebookPreview = () => (
    <div className="border rounded-lg overflow-hidden bg-white max-w-lg">
      {displayImage && (
        <div className="aspect-video bg-gray-100 relative">
          <img 
            src={displayImage} 
            alt={displayTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        </div>
      )}
      <div className="p-3 bg-gray-50">
        <div className="text-gray-500 text-xs uppercase mb-1">{domain}</div>
        <h4 className="font-semibold text-gray-900 leading-tight mb-1">
          {displayTitle}
        </h4>
        <p className="text-gray-600 text-sm leading-relaxed">
          {displayDescription}
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">SEO Preview</CardTitle>
        <CardDescription>
          See how your content will appear in search engines and social media
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* SEO Health Check */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">SEO Health Check</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Title Length ({titleLength} chars)</span>
              <Badge variant={
                seoHealth.title.status === 'good' ? 'default' : 
                seoHealth.title.status === 'warning' ? 'secondary' : 'destructive'
              }>
                {seoHealth.title.message}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Description Length ({descriptionLength} chars)</span>
              <Badge variant={
                seoHealth.description.status === 'good' ? 'default' : 
                seoHealth.description.status === 'warning' ? 'secondary' : 'destructive'
              }>
                {seoHealth.description.message}
              </Badge>
            </div>
          </div>
        </div>

        {/* Preview Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Google
            </TabsTrigger>
            <TabsTrigger value="twitter" className="flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              Twitter
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <Facebook className="h-4 w-4" />
              Facebook
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="google" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Search Result Preview</h4>
              <GooglePreview />
            </div>
          </TabsContent>
          
          <TabsContent value="twitter" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Twitter Card Preview</h4>
              <TwitterPreview />
            </div>
          </TabsContent>
          
          <TabsContent value="facebook" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Facebook Share Preview</h4>
              <FacebookPreview />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 