import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('Middleware running for path:', req.nextUrl.pathname)
  
  // Create a response object that we'll modify and return
  let res = NextResponse.next()
  
  // Skip middleware for public routes and test routes
  if (req.nextUrl.pathname === '/' ||
      req.nextUrl.pathname.startsWith('/auth/callback') || 
      req.nextUrl.pathname.startsWith('/auth-test') ||
      req.nextUrl.pathname.startsWith('/simple-auth-test') ||
      req.nextUrl.pathname.startsWith('/api/stripe/success')) {
    console.log('Skipping auth checks for public route:', req.nextUrl.pathname)
    return res
  }
  
  try {
    // Create the Supabase client using cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    // Check the current user's authentication status
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Log potential errors during user fetching
    if (userError) {
      console.error('Middleware Error getting user:', userError.message);
      // Decide how to handle: maybe allow access but log, or redirect to error page?
      // For now, let's allow the request to proceed but log the error.
    }
    
    // Log session info using the potentially fetched user
    console.log('User Auth in middleware:', {
      path: req.nextUrl.pathname,
      isAuthenticated: !!user,
      userId: user?.id || 'none',
      email: user?.email || 'none',
      cookiesPresent: req.cookies.size > 0 ? 'yes' : 'no'
    });
    
    // CMS route protection (formerly admin routes)
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        console.log('Redirecting unauthenticated user from CMS route to sign-in:', req.nextUrl.pathname);
        const redirectUrl = new URL('/sign-in', req.url);
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
      // Any authenticated user can access CMS routes
      console.log('Authenticated user accessing CMS route:', req.nextUrl.pathname);
      return res; 
    }

    // If accessing an API route, add user info if available, but don't block
    if (req.nextUrl.pathname.startsWith('/api/')) {
      if (user?.id) {
        // For API routes, we need to rewrite the request to pass user info
        // since we can't modify the original request headers
        const url = req.nextUrl.clone();
        url.searchParams.set('auth_user_id', user.id);
        
        // Create a new response with the rewritten URL
        res = NextResponse.rewrite(url);
        
        // Also set response headers and cookies for additional context
        res.headers.set('x-auth-user-id', user.id);
        if (user.email) {
          res.headers.set('x-auth-user-email', user.email);
        }
        res.cookies.set('x-user-id', user.id, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict'
        });
      }
      // Allow API requests to proceed even if user is null initially
      // The API route itself should handle authentication via Bearer token
      return res;
    }

    // Define protected routes that require authentication
    const isProtectedRoute = [
      '/settings',
      '/account',
      '/admin', // CMS routes
    ].some(path => req.nextUrl.pathname.startsWith(path))

    // If accessing a protected route and not signed in, redirect to sign-in page
    if (isProtectedRoute && !user) { // Check against the authenticated user
      console.log('Redirecting unauthenticated user to sign-in from:', req.nextUrl.pathname)
      const redirectUrl = new URL('/sign-in', req.url)
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing auth pages while signed in, redirect to CMS
    if ((req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up')) && user) {
      console.log('Redirecting authenticated user to CMS from:', req.nextUrl.pathname)
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  } catch (error) {
    console.error('Error in middleware:', error)
    // On error, allow the request to proceed but log the error
    // This prevents authentication errors from breaking the entire site
  }

  return res
}

export const config = {
  matcher: [
    '/account/:path*', // Add account route
    '/settings/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
    '/auth/callback',
    '/auth-test',
    '/admin/:path*', // Add admin routes to matcher
  ],
}
