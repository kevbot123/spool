"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PLAN_DETAILS, PLANS, AI_CONTENT_DATA } from '@/lib/config/pricing'

// Type definitions for analytics data
interface UsageStat {
  used: number
  total: number
}

interface ContentStat {
  total: number
  published: number
  draft: number
  recent: number
}

interface SiteStat {
  total: number
  active: number
}

interface UsageStats {
  aiCredits: UsageStat
  contentData: UsageStat
  aiUrls: UsageStat
}

interface AnalyticsData {
  usageStats: UsageStats
  contentStats: ContentStat
  siteStats: SiteStat
  currentPlan?: string
}

// Helper functions
const calculatePercentage = (used: number, total: number): number => {
  if (total === 0) return 0
  return Math.min((used / total) * 100, 100)
}

const formatStorage = (sizeKb: number): string => {
  if (sizeKb < 1024) {
    return `${sizeKb.toFixed(1)} KB`
  } else {
    return `${(sizeKb / 1024).toFixed(1)} MB`
  }
}

export default function AnalyticsPage() {
  const supabase = createClient()
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    getUser()
  }, [supabase])

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch user limits for usage stats
      const { data: userLimits, error: limitsError } = await supabase
        .from('user_limits')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (limitsError && limitsError.code !== 'PGRST116') {
        throw new Error('Failed to fetch usage limits')
      }

      // Fetch content statistics
      const { data: contentItems, error: contentError } = await supabase
        .from('content_items')
        .select('status, created_at')
        .eq('author_id', user.id)

      if (contentError) {
        throw new Error('Failed to fetch content statistics')
      }

      // Fetch site statistics
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id, created_at')
        .eq('user_id', user.id)

      if (sitesError) {
        throw new Error('Failed to fetch site statistics')
      }

      // Process content statistics
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const contentStats = {
        total: contentItems?.length || 0,
        published: contentItems?.filter((item: any) => item.status === 'published').length || 0,
        draft: contentItems?.filter((item: any) => item.status === 'draft').length || 0,
        recent: contentItems?.filter((item: any) => new Date(item.created_at) > oneWeekAgo).length || 0
      }

      // Process site statistics
      const siteStats = {
        total: sites?.length || 0,
        active: sites?.length || 0 // For now, consider all sites as active
      }

      // Get plan details
      const planId = userLimits?.plan_id || PLANS.FREE
      const planDetails = PLAN_DETAILS[planId] || PLAN_DETAILS[PLANS.FREE]

      // Build usage statistics
      const usageStats = {
        aiCredits: {
          used: userLimits?.message_credits_used || 0,
          total: userLimits?.message_credits || planDetails.limits.aiCredits
        },
        contentData: {
          used: userLimits?.ai_content_data_used_kb || 0,
          total: userLimits?.ai_content_data_size_kb || (planDetails.limits.contentDataSizeMB ? planDetails.limits.contentDataSizeMB * 1024 : AI_CONTENT_DATA.DEFAULT_LIMIT_MB * 1024)
        },
        aiUrls: {
          used: userLimits?.ai_urls_used || 0,
          total: userLimits?.training_urls || planDetails.limits.aiUrls
        }
      }

      setAnalyticsData({
        usageStats,
        contentStats,
        siteStats,
        currentPlan: planId
      })

    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics data')
      toast.error('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchAnalyticsData()
    }
  }, [fetchAnalyticsData, user])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your content creation and AI usage
        </p>
      </div>
      
      {/* Usage Stats - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* AI Credits KPI */}
        <Card className="py-4 pb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">AI Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.usageStats?.aiCredits?.used || 0} / {analyticsData?.usageStats?.aiCredits?.total || 0}
            </div>
            <Progress 
              value={calculatePercentage(
                analyticsData?.usageStats?.aiCredits?.used || 0,
                analyticsData?.usageStats?.aiCredits?.total || 1
              )} 
              className="h-2 mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <div>{calculatePercentage(
                analyticsData?.usageStats?.aiCredits?.used || 0,
                analyticsData?.usageStats?.aiCredits?.total || 1
              ).toFixed(1)}% Used</div>
              <div>{(analyticsData?.usageStats?.aiCredits?.total || 0) - (analyticsData?.usageStats?.aiCredits?.used || 0)} Remaining</div>
            </div>
          </CardContent>
        </Card>
        
        {/* AI Content Data KPI */}
        <Card className="py-4 pb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">AI Content Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStorage(analyticsData?.usageStats?.contentData?.used || 0)} / {formatStorage(analyticsData?.usageStats?.contentData?.total || 0)}
            </div>
            <Progress 
              value={calculatePercentage(
                analyticsData?.usageStats?.contentData?.used || 0,
                analyticsData?.usageStats?.contentData?.total || 1
              )} 
              className="h-2 mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <div>{calculatePercentage(
                analyticsData?.usageStats?.contentData?.used || 0,
                analyticsData?.usageStats?.contentData?.total || 1
              ).toFixed(1)}% Used</div>
              <div>{formatStorage((analyticsData?.usageStats?.contentData?.total || 0) - (analyticsData?.usageStats?.contentData?.used || 0))} Remaining</div>
            </div>
          </CardContent>
        </Card>
        
        {/* AI URLs KPI */}
        <Card className="py-4 pb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">AI Processing URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.usageStats?.aiUrls?.used || 0} / {analyticsData?.usageStats?.aiUrls?.total === Infinity ? "Unlimited" : analyticsData?.usageStats?.aiUrls?.total || 0}
            </div>
            {analyticsData?.usageStats?.aiUrls?.total !== Infinity && (
              <>
                <Progress 
                  value={calculatePercentage(
                    analyticsData?.usageStats?.aiUrls?.used || 0,
                    analyticsData?.usageStats?.aiUrls?.total || 1
                  )} 
                  className="h-2 mt-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <div>{calculatePercentage(
                    analyticsData?.usageStats?.aiUrls?.used || 0,
                    analyticsData?.usageStats?.aiUrls?.total || 1
                  ).toFixed(1)}% Used</div>
                  <div>{(analyticsData?.usageStats?.aiUrls?.total || 0) - (analyticsData?.usageStats?.aiUrls?.used || 0)} Remaining</div>
                </div>
              </>
            )}
            {analyticsData?.usageStats?.aiUrls?.total === Infinity && (
              <div className="text-xs text-muted-foreground mt-2">Unlimited URLs available with your plan</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content & Site Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Content Statistics</CardTitle>
            <CardDescription>Your content creation overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Content Items</span>
              <Badge variant="secondary">{analyticsData?.contentStats?.total || 0}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Published</span>
              <Badge variant="default">{analyticsData?.contentStats?.published || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Draft</span>
              <Badge variant="outline">{analyticsData?.contentStats?.draft || 0}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Created This Week</span>
              <Badge variant="secondary">{analyticsData?.contentStats?.recent || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Site Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Site Statistics</CardTitle>
            <CardDescription>Your site management overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Sites</span>
              <Badge variant="secondary">{analyticsData?.siteStats?.total || 0}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Sites</span>
              <Badge variant="default">{analyticsData?.siteStats?.active || 0}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge variant="outline">
                {PLAN_DETAILS[analyticsData?.currentPlan || PLANS.FREE]?.name || 'Free'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
