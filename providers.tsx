'use client'

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { usePostHog } from 'posthog-js/react'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  // Define routes that should NOT have analytics
  const excludedRoutes = [
    '/widget-content/', // Iframe embeds
    '/chat/',           // Direct chat pages
    '/widget/',         // Widget pages
    '/api/',           // API routes
  ]

  // Check if current path should be excluded
  const shouldExclude = excludedRoutes.some(route => pathname.startsWith(route))

  useEffect(() => {
    // Only capture pageviews for non-excluded routes
    if (!shouldExclude && pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams, posthog, shouldExclude])

  return <></>
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={<></>}>
      <PostHogPageView />
    </Suspense>
  )
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize PostHog with your configuration
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only', // Only create profiles for identified users
      capture_pageview: false, // Disable automatic pageview capture (we handle it manually)
      capture_pageleave: true, // Track when users leave pages
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('PostHog loaded successfully')
        }
      }
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  )
} 