"use client"

import React, { useEffect, useState, Suspense, useMemo, useRef, useCallback } from "react"
import { AuthProvider } from "@/context/AuthContext";
import { Logo } from "@/components/ui/logo";
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Laptop, Moon, Sun, LogOut, Settings, User, Users } from "lucide-react"
import { useTheme } from "next-themes"
import { LuAlignJustify, LuAppWindow, LuAppWindowMac, LuBlocks, LuBolt, LuBook, LuChartBar, LuChartColumn, LuChartPie, LuCode, LuCodepen, LuCodesandbox, LuCpu, LuEye, LuFullscreen, LuGlobe, LuListCheck, LuLoaderPinwheel, LuPanelsTopLeft, LuPyramid, LuRocket, LuShell, LuSquareDashedMousePointer, LuTarget } from "react-icons/lu";
import { PiCube } from "react-icons/pi";
import { PLANS } from '@/lib/config/pricing'
import { AlertBanner } from "@/components/alert-banner"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { isTrialExpired } from '@/lib/utils';
import { useLoading } from '@/context/LoadingContext';
import { RiMessage3Fill } from "react-icons/ri";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<{ messageCredits: { used: number; total: number } } | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<any>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { loading, startLoading, stopLoading } = useLoading()
  
  // Track last sync time to throttle frequent syncs
  const lastSyncTimeRef = useRef<number>(0)
  
  // On component mount, ensure any loading state is cleared
  useEffect(() => {
    stopLoading();
  }, [stopLoading]);

  const showExpiredTrialBanner = useMemo(() => {
    if (isLoading || !customerData) return false;
    // Show expired banner when trial is expired OR when trial is canceled
    return isTrialExpired(customerData.status, customerData.trial_ends_at) || customerData.status === 'canceled';
  }, [isLoading, customerData]);

  const showCancelingBanner = useMemo(() => {
    if (isLoading || !customerData) return false;
    return customerData.status === 'canceling';
  }, [isLoading, customerData]);

  // Function to fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    if (!user) return;
    
    // Update last sync timestamp
    lastSyncTimeRef.current = Date.now();
    
    try {
      // Use the sync-subscription endpoint to ensure we have the latest data from Stripe
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (token) {
        const syncResponse = await fetch('/api/stripe/sync-subscription', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('[Layout] Sync response:', syncData);
          
          // Set subscription status and trial end date
          setSubscriptionStatus(syncData.status);
          if (syncData.trial_ends_at) {
            setTrialEndsAt(syncData.trial_ends_at);
          } else {
            setTrialEndsAt(null);
          }

          // Determine current plan for display/logic
          if (syncData.status === 'trialing') {
            setSubscriptionPlan(PLANS.FREE);
          } else if (syncData.status === 'active' || syncData.status === 'canceling') {
            setSubscriptionPlan(syncData.plan_id);
          } else if (syncData.status === 'canceled' || syncData.status === 'expired') {
            setSubscriptionPlan(PLANS.POST_TRIAL);
          } else {
            setSubscriptionPlan(null); // Other inactive states
          }

          // Create customer data object for compatibility
          const customerData = {
            plan_id: syncData.plan_id,
            status: syncData.status,
            trial_ends_at: syncData.trial_ends_at,
            stripe_subscription_id: syncData.subscription_id,
            current_period_end: syncData.current_period_end
          };
          setCustomerData(customerData);

          // Fetch usage data ONLY if trialing
          if (syncData.status === 'trialing') {
            const res = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const { usage } = await res.json();
              setUsageData(usage);
            }
          }
          
          // Log auto-upgrade detection
          if (syncData.auto_upgraded) {
            console.log('[Layout] Auto-upgrade detected and synced!');
          }
          
          // Add small delay to ensure UI doesn't flash for new users
          if (syncData.status === 'trialing' && isLoading) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          console.error('[Layout] Error syncing subscription:', syncResponse.status, await syncResponse.text());
          // Fallback to direct database query if sync fails
          await fallbackFetchSubscriptionData();
        }
      } else {
        console.error('[Layout] No auth token available for sync');
        // Fallback to direct database query if no token
        await fallbackFetchSubscriptionData();
      }
    } catch (syncError) {
      console.error('[Layout] Error in subscription sync:', syncError);
      // Fallback to direct database query on error
      await fallbackFetchSubscriptionData();
    }
  }, [user, supabase, isLoading]);

  // Fallback function for direct database query (original logic)
  const fallbackFetchSubscriptionData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Query the customers table for plan and status
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('plan_id, status, trial_ends_at, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle() 
        
      if (customerError) {
        console.error('Error fetching customer data:', customerError)
        setSubscriptionPlan(null) // Treat error as inactive
      } else {
        if (customerData) {
          // Set subscription status and trial end date
          setSubscriptionStatus(customerData.status)
          if (customerData.trial_ends_at) {
            setTrialEndsAt(customerData.trial_ends_at)
          }

          // Determine current plan for display/logic
          if (customerData.status === 'trialing') {
            setSubscriptionPlan(PLANS.FREE)
          } else if (customerData.status === 'active' || customerData.status === 'canceling') {
            setSubscriptionPlan(customerData.plan_id)
          } else if (customerData.status === 'canceled') {
            setSubscriptionPlan(PLANS.POST_TRIAL) // Canceled trial should show POST_TRIAL
          } else {
            setSubscriptionPlan(null) // Other inactive states
          }

          setCustomerData(customerData);

          // Fetch usage data ONLY if trialing
          if (customerData.status === 'trialing') {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            if (token) {
              const res = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } })
              if (res.ok) {
                const { usage } = await res.json()
                setUsageData(usage)
              }
            }
          }
        } else {
          // No customer record found
          setSubscriptionPlan(null) // Treat as inactive
          setSubscriptionStatus(null)
        }
      }
    } catch (subError) {
        console.error('Error in subscription fetch block:', subError)
        setSubscriptionPlan(null)
    }
  }, [user, supabase]);

  // Get the user session when the component mounts
  useEffect(() => {
    const getUser = async () => {
      try {
        console.log('[Layout] Getting client-side session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('[Layout] Client-side session result:', {
          hasSession: !!session,
          sessionError: sessionError?.message || 'none',
          userId: session?.user?.id || 'none',
          email: session?.user?.email || 'none'
        });
        
        if (session) {
          // Get user details
          const { data: userData, error } = await supabase.auth.getUser()
          
          console.log('[Layout] Client-side getUser result:', {
            hasUser: !!userData?.user,
            error: error?.message || 'none',
            userId: userData?.user?.id || 'none'
          });
          
          if (error) {
            throw error
          }
          
          setUser(userData.user)
          
        } else {
          // No session, redirect to sign-in
          console.log('[Layout] No client-side session found, redirecting to sign-in');
          router.push('/sign-in')
        }
      } catch (error) {
        console.error('Error getting user:', error)
        toast.error('Failed to get user information')
      } finally {
        setIsLoading(false)
      }
    }
    
    getUser()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          router.push('/sign-in')
        } else if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Fetch subscription data when user is available
  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user, fetchSubscriptionData]);

  // Listen for subscription updates from other components
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      console.log('[Layout] Received subscription update event, refreshing data...');
      if (user) {
        fetchSubscriptionData();
      }
    };

    // Listen for custom events
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, [user, fetchSubscriptionData]);

  // Listen for window focus to check for auto-upgrades when user returns to app
  useEffect(() => {
    const handleWindowFocus = () => {
      // Only sync if we have a user and it's been more than 30 seconds since last sync
      if (user) {
        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTimeRef.current;
        const thirtySeconds = 30 * 1000; // 30 seconds in milliseconds
        
        if (timeSinceLastSync > thirtySeconds) {
          console.log('[Layout] Window focused, checking for subscription updates...');
          lastSyncTimeRef.current = now;
          fetchSubscriptionData();
        } else {
          console.log('[Layout] Window focused but last sync was recent, skipping...');
        }
      }
    };

    // Listen for window focus events
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user, fetchSubscriptionData]);

  // stop skeleton overlay on route change
  useEffect(() => {
    stopLoading()
  }, [pathname, stopLoading])

  // Sign out function
  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to sign out')
      }
      
      toast.success('Signed out successfully')
      router.push('/sign-in')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <div className="flex h-screen flex-col">
        <header className="top-0 z-10 border-b border-gray-200/60 bg-white">
          <div className="mx-auto">
            {/* Alert Banners */}
            {/* Email verification banner */}
            <EmailVerificationBanner />
            
            {/* Removed block for 'cancelingPlan' for trial cancellation - relying on showExpiredTrialBanner logic below */}
            {/* This block now correctly handles showing the banner when status is 'canceled' */}
            {!isLoading && showExpiredTrialBanner && (
              <div className="">
                <AlertBanner type="expiredTrial" />
              </div>
            )}
            {!isLoading && showCancelingBanner && (customerData?.trial_ends_at || customerData?.current_period_end) && (
              <div className="">
                <AlertBanner 
                  type="cancelingPlan" 
                  daysRemaining={Math.ceil((new Date(customerData.trial_ends_at || customerData.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                />
              </div>
            )}
            {/* Top row: Logo, Upgrade, User */}
            <div className="flex items-center justify-between h-13 px-7 mb-2 border-b border-gray-200/60">
              <Link href="/admin" className="flex items-center gap-2 font-semibold">
                {/* <RiMessage3Fill size={32} color="var(--primary)" />  */}
                <Logo size={55} color="#222" />
              </Link>
              
              <div className="flex items-center gap-2">
                {/* Trial usage only for free plan (status === 'trialing') */}
                {!isLoading && subscriptionPlan === PLANS.FREE && usageData && (
                  <span className="text-xs text-gray-700">
                    {usageData.messageCredits.total - usageData.messageCredits.used} / {usageData.messageCredits.total} trial credits left
                  </span>
                )}
                {/* Inactive state message - Only show when explicitly expired/canceled, not during loading */}
                {!isLoading && subscriptionStatus && ['canceled', 'expired', 'past_due', 'unpaid'].includes(subscriptionStatus) && (
                  <span className="text-xs text-red-600">Bot is inactive due to expired/canceled plan</span>
                )}
                {/* Upgrade button shown for free plan (trialing) OR inactive/expired/canceled state */}
                {!isLoading && (subscriptionPlan === PLANS.FREE || subscriptionPlan === PLANS.POST_TRIAL || (subscriptionStatus && ['canceled', 'expired', 'past_due', 'unpaid'].includes(subscriptionStatus))) && (
                  <Link href="/account?tab=billing">
                    <Button variant="outline" size="sm" className="text-blue-600 border-none hover:text-blue-600 shadow-none px-2">
                      <LuRocket />
                      Upgrade
                    </Button>
                  </Link>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user?.email} />
                        <AvatarFallback>{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || user?.email?.split('@')[0] || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email || 'Loading...'}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account?tab=account">
                        <User className="mr-2 h-4 w-4" />
                        <span>Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Bottom row: Navigation */}
            <nav className="flex items-center px-7 overflow-x-auto whitespace-nowrap">
              <Link 
                href="/admin" 
                className={`py-2.5 px-1 mr-2.5 text-[15px] font-medium flex items-center transition-colors rounded-t-lg border-b-2 hover:text-black hover:border-black ${
                  pathname === "/admin" || pathname.startsWith("/admin/") ? "border-b-2 border-black text-black hover:bg-white" : "text-gray-500 border-transparent hover:text-black"
                }`}
              >
                Content
              </Link>

              <Link 
                href="/people" 

                className={`py-2.5 px-1 mx-2.5 text-[15px] font-medium flex items-center transition-colors rounded-t-lg border-b-2 hover:text-black hover:border-black ${
                  pathname === "/people" ? "border-b-2 border-black text-black hover:bg-white" : "text-gray-500 border-transparent hover:text-black"
                }`}
              >
                People
              </Link>
              <Link 
                href="/trends" 

                className={`py-2.5 px-1 mx-2.5 text-[15px] font-medium flex items-center transition-colors rounded-t-lg border-b-2 hover:text-black hover:border-black ${
                  pathname === "/trends" ? "border-b-2 border-black text-black hover:bg-white" : "text-gray-500 border-transparent hover:text-black"
                }`}
              >
                Insights
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  New
                </span>
              </Link>
              <Link 
                href="/embed" 

                className={`py-2.5 px-1 mx-2.5 text-[15px] font-medium flex items-center transition-colors rounded-t-lg border-b-2 hover:text-black hover:border-black ${
                  pathname === "/embed" ? "border-b-2 border-black text-black hover:bg-white" : "text-gray-500 border-transparent hover:text-black"
                }`}
              >
                Install
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 bg-[#f8f8f8] flex flex-col min-h-0">
          {loading ? (
            <div className="container mx-auto space-y-4 p-4 bg-[#f8f8f8]">
              <Skeleton className="h-12 w-[200px]" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <Suspense fallback={
              <div className="container mx-auto space-y-4 p-4 bg-[#f8f8f8]">
                <Skeleton className="h-12 w-[200px]" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            }>
              {children}
            </Suspense>
          )}
        </main>
      </div>
    </AuthProvider>
  )
}
