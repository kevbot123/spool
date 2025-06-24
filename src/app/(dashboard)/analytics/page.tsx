"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsChart } from "./analytics-chart"
import { processIPLocations } from "./ip-location"
import { getCountryFlag, clearIPLocationCache } from "@/lib/ip-location"
import { toast } from 'sonner'
import { CheckCircle2, BarChart3, Globe } from "lucide-react"
import { PieChart as LucidePieChart } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton"
import {
  PieChart, 
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

// Define types for our analytics data
interface UsageStat {
  used: number
  total: number
}

interface UsageStats {
  messageCredits: UsageStat
  trainingData: UsageStat
  trainingUrls: UsageStat
}

interface CountryData {
  countryCode: string | null;
  countryName: string;
  count: number
}

interface DailyChat {
  date: string
  chats: number
}

interface AnalyticsData {
  totalChats: number
  dailyChats: DailyChat[]
  ipAddresses: string[]
  countryData: CountryData[]
  usageStats: UsageStats
}

// Status data for the uptime monitor
const statusData = [
  { name: "API", status: "operational", uptime: "100%" },
  { name: "Web App", status: "operational", uptime: "100%" },
  { name: "Database", status: "operational", uptime: "100%" },
  { name: "Storage", status: "operational", uptime: "100%" }
]

export default function AnalyticsPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  
  const [user, setUser] = useState<any>(null)
  const [chatbotId, setChatbotId] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [countryData, setCountryData] = useState<CountryData[]>([])
  const [isLoadingCountryData, setIsLoadingCountryData] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Chart config for colors - define outside component if static
  const chartColors = [
    "var(--primary)", // Primary blue
    "var(--red-500)", // Red 500
    "var(--green-500)", // Green 500
    "var(--amber-500)", // Amber 500
    "var(--purple-500)", // Purple 500
  ];

  // Prepare data and config for the pie chart
  const pieChartData = countryData.slice(0, 5).map((item, index) => ({
    name: item.countryName || 'Unknown',
    value: item.count,
    fill: chartColors[index % chartColors.length], // Assign color based on index
  }));

  const pieChartConfig = pieChartData.reduce((acc, item, index) => {
    acc[item.name] = { 
      label: item.name, 
      color: chartColors[index % chartColors.length] 
    };
    return acc;
  }, {} as ChartConfig);

  // Fetch user and chatbot data with a slight delay to prioritize initial UI rendering
  useEffect(() => {
    // Small delay to ensure initial UI renders first
    const timer = setTimeout(() => {
      const fetchUserAndChatbot = async () => {
        console.time('auth-and-chatbot'); // Performance measurement
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) {
            setIsLoading(false)
            return
          }
          
          setUser(session.user)
          
          // Get the user's chatbot - try to get any chatbot without filtering by published status
          // This avoids the 400 Bad Request error with boolean fields
          let { data: chatbots, error: chatbotError } = await supabase
            .from('chatbots')
            .select('id, is_published')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10)
          
          // Process the chatbots - first try to find a published one, then fall back to any
          if (chatbotError || !chatbots || chatbots.length === 0) {
            console.error('Error fetching chatbots:', chatbotError)
            toast.error('No chatbot found. Please create a chatbot first.')
            setIsLoading(false)
            return
          }
          
          // First try to find a published chatbot
          const publishedChatbot = chatbots.find(chatbot => chatbot.is_published === true);
          
          if (publishedChatbot) {
            setChatbotId(publishedChatbot.id)
            console.log(`Analytics Page: Using PUBLISHED chatbot ID: ${publishedChatbot.id}`);
          } else {
            // Fall back to any chatbot
            console.log('Analytics Page: No published chatbot found, using first available (most recent) chatbot ID: ' + chatbots[0].id)
            setChatbotId(chatbots[0].id)
          }
        } catch (error) {
          console.error('Error in fetchUserAndChatbot:', error)
          setIsLoading(false)
        } finally {
          console.timeEnd('auth-and-chatbot');
        }
      }
      
      fetchUserAndChatbot()
    }, 50); // 50ms delay for initial render
    
    return () => clearTimeout(timer);
  }, [supabase])
  
  // Fetch analytics data when chatbotId is available - with optimized loading
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!chatbotId || !user) return
      
      setIsLoading(true)
      console.time('analytics-data'); // Performance measurement
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        if (!token) {
          toast.error('Authentication error')
          setIsLoading(false)
          return
        }
        
        const response = await fetch(`/api/analytics?chatbotId=${chatbotId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data')
        }
        
        const data = await response.json()
        setAnalyticsData(data)
        setIsLoading(false) // Set loading to false as soon as main data is ready
        
        // Process IP addresses asynchronously AFTER main data is displayed
        // This ensures the UI is responsive and ready for user interaction
        if (data.ipAddresses && data.ipAddresses.length > 0) {
          // Short delay to ensure main UI has rendered
          setTimeout(() => {
            processIPsAsynchronously(data.ipAddresses);
          }, 500);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        toast.error('Failed to fetch analytics data')
        setIsLoading(false)
      } finally {
        console.timeEnd('analytics-data');
      }
    }
    
    // Helper function to process IPs in batches without blocking UI
    const processIPsAsynchronously = async (ipAddresses: string[]) => {
      setIsLoadingCountryData(true);
      
      try {
        // Process in smaller chunks if there are many IPs
        const MAX_IPS_PER_BATCH = 10;
        if (ipAddresses.length > MAX_IPS_PER_BATCH) {
          // For large sets, just take a representative sample
          // This avoids spending too much time on IP processing
          const sampleIPs = ipAddresses.slice(0, MAX_IPS_PER_BATCH);
          const processedCountryData = await processIPLocations(sampleIPs);
          setCountryData(processedCountryData);
        } else {
          const processedCountryData = await processIPLocations(ipAddresses);
          setCountryData(processedCountryData);
        }
      } catch (error) {
        console.error('Error processing IP locations for analytics:', error);
        // Set empty country data on error rather than leaving it in loading state
        setCountryData([]);
      } finally {
        setIsLoadingCountryData(false);
      }
    };
    
    fetchAnalyticsData();
  }, [chatbotId, supabase, user])
  
  // Format storage size
  const formatStorage = (sizeKB: number) => {
    if (sizeKB < 1024) {
      return `${sizeKB}KB`
    } else {
      return `${(sizeKB / 1024).toFixed(1)}MB`
    }
  }
  
  // Calculate percentage for progress bars
  const calculatePercentage = (used: number, total: number) => {
    if (total <= 0) return 0
    const percentage = (used / total) * 100
    return Math.min(percentage, 100) // Cap at 100%
  }
  
  // Calculate total chats for different periods
  const getTotalChats = (dailyChats: DailyChat[] = [], period: 'all' | 'billing' = 'all') => {
    if (!dailyChats || dailyChats.length === 0) return 0;
    
    const chatsToCount = period === 'billing' 
      ? dailyChats.slice(0, 30) // Last 30 days for billing period
      : dailyChats;
      
    return chatsToCount.reduce((acc, curr) => acc + curr.chats, 0);
  }
  
  // Helper function to clear IP cache for debugging
  const clearCacheAndReprocess = async () => {
    console.log('[Analytics] Clearing IP cache and reprocessing...');
    clearIPLocationCache();
    setCountryData([]);
    setIsLoadingCountryData(true);
    
    // Reprocess IPs after cache clear
    if (analyticsData?.ipAddresses && analyticsData.ipAddresses.length > 0) {
      try {
        // Process in smaller chunks if there are many IPs
        const MAX_IPS_PER_BATCH = 10;
        if (analyticsData.ipAddresses.length > MAX_IPS_PER_BATCH) {
          // For large sets, just take a representative sample
          // This avoids spending too much time on IP processing
          const sampleIPs = analyticsData.ipAddresses.slice(0, MAX_IPS_PER_BATCH);
          const processedCountryData = await processIPLocations(sampleIPs);
          setCountryData(processedCountryData);
        } else {
          const processedCountryData = await processIPLocations(analyticsData.ipAddresses);
          setCountryData(processedCountryData);
        }
      } catch (error) {
        console.error('Error processing IP locations for analytics:', error);
        // Set empty country data on error rather than leaving it in loading state
        setCountryData([]);
      } finally {
        setIsLoadingCountryData(false);
      }
    } else {
      setIsLoadingCountryData(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        {/* Usage Stats Cards Skeleton - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="py-4 pb-5 rootcard">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Activity Card Skeleton */}
        <Card className="mb-4 gap-0 rootcard">
          <CardHeader className="flex flex-col items-stretch space-y-0 p-0 mb-0 pb-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-5 sm:py-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-8 w-12" />
              </div>
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-l px-6 py-4 text-left sm:border-t-0 sm:px-8 sm:py-6">
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 border-t">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Country Data Skeleton - 2 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Top Countries Skeleton */}
          <Card className="py-5 rootcard">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Country Distribution Skeleton */}
          <Card className="py-5 rootcard">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[250px]">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Skeleton */}
        <Card className="py-5 rootcard">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-40 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <Skeleton className="h-5 w-5 mr-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-20 mr-2" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4">
      
      {/* Usage Stats - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Message Credits KPI */}
        <Card className="py-4 pb-5 rootcard">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Message Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.usageStats?.messageCredits?.used || 0} / {analyticsData?.usageStats?.messageCredits?.total || 0}
            </div>
            <Progress 
              value={calculatePercentage(
                analyticsData?.usageStats?.messageCredits?.used || 0,
                analyticsData?.usageStats?.messageCredits?.total || 1
              )} 
              className="h-2 mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <div>{calculatePercentage(
                analyticsData?.usageStats?.messageCredits?.used || 0,
                analyticsData?.usageStats?.messageCredits?.total || 1
              ).toFixed(1)}% Used</div>
              <div>{(analyticsData?.usageStats?.messageCredits?.total || 0) - (analyticsData?.usageStats?.messageCredits?.used || 0)} Remaining</div>
            </div>
          </CardContent>
        </Card>
        
        {/* Training Data KPI */}
        <Card className="py-4 pb-5 rootcard">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Training Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStorage(analyticsData?.usageStats?.trainingData?.used || 0)} / {formatStorage(analyticsData?.usageStats?.trainingData?.total || 0)}
            </div>
            <Progress 
              value={calculatePercentage(
                analyticsData?.usageStats?.trainingData?.used || 0,
                analyticsData?.usageStats?.trainingData?.total || 1
              )} 
              className="h-2 mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <div>{calculatePercentage(
                analyticsData?.usageStats?.trainingData?.used || 0,
                analyticsData?.usageStats?.trainingData?.total || 1
              ).toFixed(1)}% Used</div>
              <div>{formatStorage((analyticsData?.usageStats?.trainingData?.total || 0) - (analyticsData?.usageStats?.trainingData?.used || 0))} Remaining</div>
            </div>
          </CardContent>
        </Card>
        
        {/* Training URLs KPI */}
        <Card className="py-4 pb-5 rootcard">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Training URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.usageStats?.trainingUrls?.used || 0} / {analyticsData?.usageStats?.trainingUrls?.total === 999999 ? "Unlimited" : analyticsData?.usageStats?.trainingUrls?.total || 0}
            </div>
            {analyticsData?.usageStats?.trainingUrls?.total !== 999999 && (
              <>
                <Progress 
                  value={calculatePercentage(
                    analyticsData?.usageStats?.trainingUrls?.used || 0,
                    analyticsData?.usageStats?.trainingUrls?.total || 1
                  )} 
                  className="h-2 mt-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <div>{calculatePercentage(
                    analyticsData?.usageStats?.trainingUrls?.used || 0,
                    analyticsData?.usageStats?.trainingUrls?.total || 1
                  ).toFixed(1)}% Used</div>
                  <div>{(analyticsData?.usageStats?.trainingUrls?.total || 0) - (analyticsData?.usageStats?.trainingUrls?.used || 0)} Remaining</div>
                </div>
              </>
            )}
            {analyticsData?.usageStats?.trainingUrls?.total === 999999 && (
              <div className="text-xs text-muted-foreground mt-2">Unlimited URLs available with your plan</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Chat Activity Card */}
      <Card className="mb-4 gap-0 rootcard">
        <CardHeader className="flex flex-col items-stretch space-y-0 p-0 mb-0 pb-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-5 sm:py-6">
            <CardTitle>Chat Activity</CardTitle>
            <CardDescription>
              Showing chat activity for the last 30 days
            </CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
              <span className="text-xs text-muted-foreground">Last 90 Days</span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {getTotalChats(analyticsData?.dailyChats, 'all')}
              </span>
            </div>
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-l px-6 py-4 text-left sm:border-t-0 sm:px-8 sm:py-6">
              <span className="text-xs text-muted-foreground">Billing Period</span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {getTotalChats(analyticsData?.dailyChats, 'billing')}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 border-t">
          <div className="mt-2">
            <AnalyticsChart 
              data={analyticsData?.dailyChats || []} 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Country Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Top Countries */}
        <Card className="py-5 rootcard">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Countries</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingCountryData ? (
              <p className="text-sm text-gray-500">Loading country data...</p>
            ) : countryData.length > 0 ? (
              <div className="space-y-3">
                {countryData.slice(0, 5).map((item, index) => {
                  // Get the correct flag emoji based on countryCode
                  const code = item.countryCode;
                  const flagEmoji = code ? getCountryFlag(code) : '🌐';
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base w-5 flex justify-center">
                          {flagEmoji}
                        </span>
                        <span className="text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                          {item.countryName}
                        </span>
                      </div>
                      <span className="text-sm text-tremor-content dark:text-dark-tremor-content">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="flex items-center justify-center h-30 text-sm text-muted-foreground">No country data available.</p>
            )}
          </CardContent>
        </Card>
        
        {/* Country Distribution */}
        <Card className="py-5 rootcard">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Country Distribution</CardTitle>
              <LucidePieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCountryData ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 text-sm text-muted-foreground">Processing location data...</span>
              </div>
            ) : pieChartData && pieChartData.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0];
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: data.payload.fill }}
                                />
                                <span className="font-medium">{data.payload.name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {data.value} chats
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60} // Make it a donut chart
                      outerRadius={80}
                      paddingAngle={5}
                      cx="50%"
                      cy="50%"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      content={(props) => {
                        const { payload } = props;
                        return (
                          <ul className="flex gap-4 justify-center mt-4">
                            {payload?.map((entry, index) => (
                              <li key={`item-${index}`} className="flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.value}
                              </li>
                            ))}
                          </ul>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No country data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* System Status */}
      <Card className="py-5 rootcard">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <CardDescription>All systems operational</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2 text-sm">{item.status}</span>
                  <span className="text-sm text-muted-foreground">{item.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
