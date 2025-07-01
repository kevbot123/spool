import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const inter = Inter({ subsets: ['latin'] });

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className}>
      {/* Demo Blog Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/demo/blog" className="text-2xl font-bold text-gray-900">
                Spool Demo Blog
              </Link>
              <Badge variant="secondary" className="text-xs">
                CMS Testing Environment
              </Badge>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link 
                href="/demo/blog" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/demo/blog/posts" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                All Posts
              </Link>
              <Link 
                href="/admin" 
                className="text-sm font-medium bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              >
                CMS Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>

      {/* Demo Blog Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Demo Blog</h3>
              <p className="text-gray-600 text-sm">
                This is a demo blog built with Spool CMS to showcase all the headless CMS features including real-time editing, SEO optimization, and Next.js integration.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Features Tested</h3>
              <ul className="text-gray-600 text-sm space-y-2">
                <li>• Headless API integration</li>
                <li>• Dynamic page generation</li>
                <li>• SEO metadata & Open Graph</li>
                <li>• Sitemap & robots.txt</li>
                <li>• Real-time content updates</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Links</h3>
              <div className="space-y-2">
                <div>
                  <Link 
                    href="/admin" 
                    className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                  >
                    CMS Admin Dashboard
                  </Link>
                </div>
                <div>
                  <Link 
                    href="/demo/spool-integration" 
                    className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                  >
                    Integration Documentation
                  </Link>
                </div>
                <div>
                  <Link 
                    href="/demo/blog/sitemap.xml" 
                    className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                  >
                    Generated Sitemap
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-gray-600 text-sm">
            <p>Built with Spool CMS & Next.js • Demo Environment</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 