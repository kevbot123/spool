'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from "react"
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { PricingTable } from "@/components/pricing/pricing-table"
import { UsageDisplay } from "@/components/pricing/usage-display"
import { PLANS, PLAN_DETAILS } from "@/lib/config/pricing"
import { useSearchParams } from "next/navigation"
import { Info, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isTrialExpired } from '@/lib/utils'; // Import the utility function
import { SubscriptionRepair } from '@/components/pricing/subscription-repair';
import { validatePassword } from "@/lib/password-validation"
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator"
import { AnalyticsOverview } from "@/components/admin/AnalyticsOverview"
import { useAdminHeader } from "@/context/AdminHeaderContext"

// Define UsageData type inline
interface UsageData {
  messageCredits: { used: number; total: number };
  trainingData: { used: number; total: number }; // in KB
  trainingUrls: { used: number; total: number };
};

// Placeholder type for Subscription - replace with actual generated type if available
interface SubscriptionWithPriceAndProduct {
  id: string;
  user_id: string;
  status: string;
  prices: {
    id: string;
    products: {
      id: string;
      name: string;
      // ... other product fields
    } | null;
    // ... other price fields
  } | null;
  // ... other subscription fields
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const router = useRouter();
  const { setHeaderContent, setBreadcrumbs } = useAdminHeader();
  
  // Explicitly pass env variables to createBrowserClient
  const [supabase] = useState(() =>
    createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  
  // State for user and loading
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for account settings
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [originalEmail, setOriginalEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelingTrial, setIsCancelingTrial] = useState(false); // State for trial cancellation loading
  
  // State for password change
  const [passwordChangeMode, setPasswordChangeMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('account');

  // State for subscription and usage
  const [currentPlan, setCurrentPlan] = useState(PLANS.FREE);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [billingDataLoaded, setBillingDataLoaded] = useState(false); // New state to track if billing data is loaded
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null); // Track subscription errors

  // Use the hook
  const searchParams = useSearchParams(); // Use the hook
  const isFromPortal = searchParams.get('from_portal') === 'true';
  const isFromCheckout = searchParams.get('success') === 'true' && searchParams.get('session_id');

  // Effect to set initial tab from URL or sessionStorage
  useEffect(() => {
    // First check if we're returning from Stripe and should go to billing tab
    const returnToBillingTab = sessionStorage.getItem('returnToBillingTab');
    
    if (returnToBillingTab === 'true') {
      // Clear the flag so it doesn't affect future navigation
      sessionStorage.removeItem('returnToBillingTab');
      setActiveTab('billing');
      
      // Update URL with tab parameter
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'billing');
      window.history.replaceState({}, '', url.toString());
    } else {
      // Otherwise use the tab from URL if available
      const tabFromUrl = searchParams.get('tab');
      if (tabFromUrl && ['account', 'billing'].includes(tabFromUrl)) { 
        setActiveTab(tabFromUrl);
      }
    }
  }, [searchParams]); // Re-run if searchParams change

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    
    // Update URL with tab parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Set up header breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Account', href: '/admin/account' }
    ]);

    return () => {
      setBreadcrumbs([]);
    };
  }, [setBreadcrumbs]);
  
  // Helper function to set default usage data based on the current plan
  const setDefaultUsageData = useCallback((fetchedUsageDetails?: { message_credits_used?: number; training_data_used_kb?: number; training_urls_used?: number } | null) => {
    let newMessageCreditsTotal: number;
    let newTrainingDataTotal: number; // in KB
    let newTrainingUrlsTotal: number;

    const freeLimits = PLAN_DETAILS[PLANS.FREE]?.limits;
    const hobbyLimits = PLAN_DETAILS[PLANS.HOBBY]?.limits;
    const businessLimits = PLAN_DETAILS[PLANS.BUSINESS]?.limits;

    if (currentPlan === PLANS.BUSINESS) {
      newMessageCreditsTotal = businessLimits?.messageCredits ?? 10000;
      newTrainingDataTotal = businessLimits?.trainingDataSizeMB ? businessLimits.trainingDataSizeMB * 1024 : (businessLimits?.trainingDataSizeKB ?? (100 * 1024));
      newTrainingUrlsTotal = businessLimits?.trainingUrls ?? 999999;
    } else if (currentPlan === PLANS.HOBBY) {
      newMessageCreditsTotal = hobbyLimits?.messageCredits ?? 3000;
      newTrainingDataTotal = hobbyLimits?.trainingDataSizeMB ? hobbyLimits.trainingDataSizeMB * 1024 : (hobbyLimits?.trainingDataSizeKB ?? (35 * 1024));
      newTrainingUrlsTotal = hobbyLimits?.trainingUrls ?? 999999;
    } else { // Default to FREE plan limits or other specific plan if currentPlan is defined
      const currentPlanLimits = PLAN_DETAILS[currentPlan]?.limits;
      newMessageCreditsTotal = currentPlanLimits?.messageCredits ?? freeLimits?.messageCredits ?? 100;
      if (currentPlanLimits?.trainingDataSizeMB) {
        newTrainingDataTotal = currentPlanLimits.trainingDataSizeMB * 1024;
      } else if (currentPlanLimits?.trainingDataSizeKB) {
        newTrainingDataTotal = currentPlanLimits.trainingDataSizeKB;
      } else { // Fallback to Free plan's KB or default
        newTrainingDataTotal = freeLimits?.trainingDataSizeKB ?? 400;
      }
      newTrainingUrlsTotal = currentPlanLimits?.trainingUrls ?? freeLimits?.trainingUrls ?? 10;
    }

    console.log('[setDefaultUsageData MAIN] Calculated Totals:', { newMessageCreditsTotal, newTrainingDataTotal, newTrainingUrlsTotal });
    setUsageData(prev => {
      console.log('[setDefaultUsageData MAIN] prev:', JSON.stringify(prev, null, 2));
      const newUsageData = {
        messageCredits: {
          used: fetchedUsageDetails?.message_credits_used ?? prev?.messageCredits?.used ?? 0,
          total: newMessageCreditsTotal
        },
        trainingData: {
          used: fetchedUsageDetails?.training_data_used_kb ?? prev?.trainingData?.used ?? 0,
          total: newTrainingDataTotal
        },
        trainingUrls: {
          used: fetchedUsageDetails?.training_urls_used ?? prev?.trainingUrls?.used ?? 0,
          total: newTrainingUrlsTotal
        },
      };
      console.log('[setDefaultUsageData MAIN] Setting usageData to:', JSON.stringify(newUsageData, null, 2));
      return newUsageData;
    });
  }, [currentPlan, setUsageData]); // Added fetchedUsageDetails parameter
  
  useEffect(() => {
    console.log('[useEffect usageData Monitor] usageData changed:', JSON.stringify(usageData, null, 2));
  }, [usageData]);

  // Fetch user's subscription and usage data
  const fetchSubscriptionData = useCallback(async (syncedFromPortal = false) => {
    if (!user) return;
    setLoading(true);
    setIsLoading(true); // Set billing loading state

    // Check if returning from Stripe portal or checkout using the hook
    if (isFromPortal || isFromCheckout) {
      console.log(isFromPortal ? '[Portal Return] Detected. Initiating sync...' : '[Checkout Return] Detected. Initiating sync...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const syncResp = await fetch('/api/stripe/sync-subscription', {
            headers: { Authorization: `Bearer ${token}` }
          });
          // console.log('[Portal Return] Sync API Response:', JSON.stringify(syncResp, null, 2)); // Too verbose
          if (syncResp.ok) {
            const syncData = await syncResp.json();
            console.log('[Portal Return] Sync API Data:', JSON.stringify(syncData, null, 2));
            if (syncData.synced) {
              // console.log(`[Portal Return] State BEFORE setting status: currentPlan=${currentPlan}, subscriptionStatus=${subscriptionStatus}`);
              setCurrentPlan(syncData.plan_id);
              setSubscriptionStatus(syncData.status);
              setStripeSubscriptionId(syncData.subscription_id);
              setStripeCustomerId(syncData.customer_id);
              setTrialEndDate(syncData.trial_ends_at ? new Date(syncData.trial_ends_at) : null);
              // console.log(`[Portal Return] State AFTER setting status: currentPlan=${syncData.plan_id}, subscriptionStatus=${syncData.status}`);
              syncedFromPortal = true;
              
              // Notify layout component that subscription has been updated
              window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
              console.log(isFromPortal ? '[Portal Return] Dispatched subscriptionUpdated event to layout' : '[Checkout Return] Dispatched subscriptionUpdated event to layout');
              
              const currentPath = window.location.pathname + window.location.hash.split('?')[0]; // Get path + hash without query
              router.replace(currentPath, { scroll: false }); // Remove query params
              console.log(isFromPortal ? '[Portal Return] Sync successful and state updated. URL cleaned.' : '[Checkout Return] Sync successful and state updated. URL cleaned.');
            } else {
              console.warn('[Portal Return] Sync API call succeeded but did not report sync:', syncData);
            }
          } else {
            console.error('[Portal Return] Sync API call failed:', syncResp.status, await syncResp.text());
          }
        } else {
          console.error('[Portal Return] Could not get auth token for sync.');
        }
      } catch (err) {
        console.error('[Portal Return] Error during sync fetch:', err);
      }
    }

    try {
      let localStripeCustomerId: string | null = null;

      if (!syncedFromPortal) {
        const { data: customerRecord, error: customerError } = await supabase
          .from('customers')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (customerError) {
          console.warn('[AccountPage] Error fetching initial stripe_customer_id from DB:', customerError.message);
        }
        if (customerRecord) {
          localStripeCustomerId = customerRecord.stripe_customer_id;
        }
      }

      if (!stripeCustomerId && !localStripeCustomerId) {
        console.log('[AccountPage] No Stripe Customer ID found from portal or local DB. Attempting POST /api/stripe/sync-customer...');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          try {
            const syncCustomerResp = await fetch('/api/stripe/sync-customer', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (syncCustomerResp.ok) {
              const syncCustomerData = await syncCustomerResp.json();
              console.log('[AccountPage] POST /api/stripe/sync-customer successful:', syncCustomerData);
              if (syncCustomerData.stripe_customer_id) setStripeCustomerId(syncCustomerData.stripe_customer_id);
            } else {
              console.error('[AccountPage] POST /api/stripe/sync-customer call failed:', syncCustomerResp.status, await syncCustomerResp.text());
              setSubscriptionError("Could not initialize your customer record. Please try refreshing.");
            }
          } catch (err: any) {
            console.error('[AccountPage] Error during POST /api/stripe/sync-customer call:', err);
            setSubscriptionError(`Error initializing customer record: ${err.message}`);
          }
        }
      }

      console.log('[AccountPage] Proceeding to GET /api/stripe/sync-subscription...');
      const { data: { session: sessionForSubSync } } = await supabase.auth.getSession();
      const tokenForSubSync = sessionForSubSync?.access_token;

      if (tokenForSubSync) {
        try {
          const syncSubscriptionResp = await fetch('/api/stripe/sync-subscription', {
            headers: { Authorization: `Bearer ${tokenForSubSync}` }
          });
          if (syncSubscriptionResp.ok) {
            const syncSubData = await syncSubscriptionResp.json();
            console.log('[AccountPage] GET /api/stripe/sync-subscription successful. Full response object:', JSON.stringify(syncSubData, null, 2));
            console.log('[AccountPage] Setting state - plan:', syncSubData.plan_id || PLANS.FREE, 'status:', syncSubData.status);
            setCurrentPlan(syncSubData.plan_id || PLANS.FREE);
            setSubscriptionStatus(syncSubData.status);
            setTrialEndDate(syncSubData.trial_ends_at ? new Date(syncSubData.trial_ends_at) : null);
            setStripeSubscriptionId(syncSubData.subscription_id);
            setStripeCustomerId(syncSubData.customer_id);
            setSubscriptionError(null);
            
            // Notify layout component that subscription has been updated
            window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
            console.log('[AccountPage] Dispatched subscriptionUpdated event to layout after sync');
          } else {
            const errorText = await syncSubscriptionResp.text();
            console.error('[AccountPage] GET /api/stripe/sync-subscription call failed:', syncSubscriptionResp.status, errorText);
            setSubscriptionError(`Failed to sync your subscription: ${errorText}. Please try refreshing.`);
          }
        } catch (err: any) {
          console.error('[AccountPage] Error during GET /api/stripe/sync-subscription call:', err);
          setSubscriptionError(`Error syncing subscription: ${err.message}`);
        }
      } else {
        console.error("[AccountPage] No token for GET /api/stripe/sync-subscription");
        setSubscriptionError("Authentication error. Cannot sync subscription.");
      }

      // setDefaultUsageData(); // Moved to after fetching usage details

      let apiUsageDetails = null;
      if (!syncedFromPortal) {
        console.log('[AccountPage] Fetching usage data from /api/usage...');
        setIsLoadingUsage(true);
        try {
          const { data: { session: usageSession } } = await supabase.auth.getSession();
          const usageToken = usageSession?.access_token;
          if (usageToken) {
            const usageResponse = await fetch('/api/usage', {
              headers: { 'Authorization': `Bearer ${usageToken}` }
            });
            if (usageResponse.ok) {
              const usageJson = await usageResponse.json();
              if (usageJson.usage) {
                console.log("[AccountPage /api/usage 1] Raw API response:", JSON.stringify(usageJson, null, 2));
                console.log("[AccountPage /api/usage 1] Storing usageData from API:", JSON.stringify(usageJson.usage, null, 2));
                // Extract numeric usage details for setDefaultUsageData
                const { messageCredits, trainingData, trainingUrls } = usageJson.usage;
                apiUsageDetails = {
                  message_credits_used: messageCredits.used,
                  training_data_used_kb: trainingData.used,
                  training_urls_used: trainingUrls.used,
                };
              } else {
                console.log("[AccountPage /api/usage 1] No 'usage' property in API response.");
              }
            } else {
              console.warn('[AccountPage] /api/usage call failed or returned no usage data.');
            }
          }
        } catch (error) {
          console.error('[AccountPage] Error fetching usage data:', error);
        } finally {
          setIsLoadingUsage(false);
        }
      } // Closing brace of if (!syncedFromPortal)
      setDefaultUsageData(apiUsageDetails); // Call after if block, before main catch
    } catch (error: any) {
      console.error('Error in fetchSubscriptionData outer try-catch:', error);
      setCurrentPlan(PLANS.FREE);
      setDefaultUsageData(null); // Pass null as no usage details fetched on error
      setSubscriptionStatus(null);
      setTrialEndDate(null);
      setStripeSubscriptionId(null);
      setStripeCustomerId(null);
      setSubscriptionError(`An unexpected error occurred while fetching your subscription details: ${error.message}`);
    } finally {
      setLoading(false);
      setIsLoading(false);
      setBillingDataLoaded(true);
    }
  }, [user, supabase, setDefaultUsageData, isFromPortal, isFromCheckout]);
  
  // Fetch initial data on component mount or when user changes
  useEffect(() => {
    if (user) { 
      // Reset the billing data loaded state when user changes
      setBillingDataLoaded(false);
      fetchSubscriptionData();
    }
  }, [user]); // Only re-run when user changes to avoid duplicate calls

  // Fetch user session and data
  const fetchSessionAndData = async () => {
    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Set user from session
      setUser(session.user);
      
      // Use email directly from the session
      if (session.user.email) {
        setEmail(session.user.email);
        setOriginalEmail(session.user.email);
        // Use email as fallback for full name
        setFullName(session.user.email.split('@')[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchSessionAndData:', error);
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchSessionAndData();

    // Listen for auth changes to keep the session updated
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Handle account updates
  const handleSaveAccount = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // If in password change mode, update password
      if (passwordChangeMode) {
        if (!currentPassword) {
          toast.error('Current password is required');
          setIsSaving(false);
          return;
        }
        
        if (!newPassword) {
          toast.error('New password is required');
          setIsSaving(false);
          return;
        }
        
                if (newPassword !== confirmPassword) {
          toast.error('New passwords do not match');
          setIsSaving(false);
          return;
        }

        // Validate password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
          toast.error('Please fix the password requirements below');
          setIsSaving(false);
          return;
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (error) {
          toast.error(`Error updating password: ${error.message}`);
        } else {
          toast.success('Password updated successfully');
          setPasswordChangeMode(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      } else {
        // Update email if changed
        if (email !== originalEmail) {
          const { error: emailError } = await supabase.auth.updateUser({
            email: email,
          });
          
          if (emailError) {
            toast.error(`Error updating email: ${emailError.message}`);
          } else {
            toast.success('Verification email sent. Please check your inbox.');
            setOriginalEmail(email); // Update original email to prevent multiple requests
          }
        }
        // If only name changed, show a simple success message as it's only local state
        else {
          toast.success('Name updated in session');
        }
      }
    } catch (error: any) {
      console.error('Error in handleSaveAccount:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle plan upgrade
  const handleUpgrade = async (planId: string) => {
    // Prevent multiple clicks while processing
    if (isLoading || planId === currentPlan) return;
    
    setIsLoading(true); // Set loading state when upgrade is clicked
    // Sync with Stripe to verify current plan and prevent redundant upgrades
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const syncResp = await fetch('/api/stripe/sync-subscription', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const syncData = await syncResp.json();
        if (syncResp.ok && syncData.synced) {
          // Update UI state from Stripe
          setCurrentPlan(syncData.plan_id);
          setSubscriptionStatus(syncData.status);
          setStripeSubscriptionId(syncData.subscription_id);
          setStripeCustomerId(syncData.customer_id);
          setTrialEndDate(null);
          // Block if already on requested plan AND NOT trialing
          if (syncData.plan_id === planId && syncData.status !== 'trialing') { 
            toast.error(`You're already on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan.`);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Stripe verification failed:', err);
    }

    if (!user) {
      toast.error("You must be logged in to upgrade your plan.");
      return;
    }

    // For free plan, handle directly without Stripe
    if (planId === PLANS.FREE) {
      try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          toast.error("Authentication error. Please log in again.");
          return;
        }

        // Call API to cancel subscription if needed
        if (stripeSubscriptionId) {
          const response = await fetch('/api/stripe/cancel-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscriptionId: stripeSubscriptionId || null })
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to cancel subscription.');
          }
        }

        setCurrentPlan(PLANS.FREE);
        toast.success("Successfully downgraded to the Free plan.");
        router.refresh();
        return;
      } catch (error: any) {
        console.error('Error downgrading to free plan:', error);
        toast.error(`Failed to downgrade: ${error.message}`);
        return;
      }
    }

    // Check if we need the direct upgrade flow (Trial or Post-Trial/Canceled)
    const useDirectCheckoutFlow = subscriptionStatus === 'trialing' || subscriptionStatus === 'canceled';
    
    // For paid plans, check if we need direct upgrade or portal
    if (!stripeCustomerId) {
      toast.error("Could not find customer details. Please try again or contact support.");
      return;
    }

    try {
      // Get the JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error("Authentication error. Please log in again.");
        return;
      }

      // If upgrading from trial OR canceled state, use a direct checkout flow
      // The customer portal doesn't work well for these scenarios
      if (useDirectCheckoutFlow) {
        toast.loading("Creating your upgrade checkout...");
        
        // Attempt to cancel the existing subscription if it exists (trial or previously canceled)
        if (stripeSubscriptionId) {
          try {
            const cancelResponse = await fetch('/api/stripe/cancel-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ subscriptionId: stripeSubscriptionId || null })
            });
            
            if (!cancelResponse.ok) {
              const errorData = await cancelResponse.json();
              console.warn('Non-blocking warning when cancelling trial:', errorData);
              // Continue even if cancellation fails - we'll create a new subscription anyway
            } else {
              console.log('Successfully cancelled trial before upgrade');
            }
          } catch (cancelError) {
            console.warn('Non-blocking error when cancelling trial:', cancelError);
            // Continue even if cancellation fails
          }
        }
        
        // Now create a new checkout session for the paid plan
        try {
          const checkoutResponse = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ planId })
          });
          
          const checkoutData = await checkoutResponse.json();
          
          if (!checkoutResponse.ok) {
            throw new Error(checkoutData.error || 'Failed to create checkout for upgrade');
          }
          
          // Redirect to the checkout URL
          if (checkoutData.url) {
            // Store the current tab in sessionStorage before redirecting
            sessionStorage.setItem('returnToBillingTab', 'true');
            // Direct redirect without page reload
            window.location.assign(checkoutData.url);
          } else {
            throw new Error('No checkout URL returned');
          }
        } catch (checkoutError: any) {
          console.error('Error creating checkout for upgrade:', checkoutError);
          toast.error(`Failed to set up upgrade: ${checkoutError.message}`);
          setIsLoading(false); // Reset loading state on error
        }
        
        return;
      }
      
      // For non-trial plan changes, use the customer portal
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          flow_type: 'subscription_update',
          subscription_id: stripeSubscriptionId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to access billing portal.');
      }

      // Redirect to the Stripe Customer Portal
      if (result.url) {
        // Store the current tab in sessionStorage before redirecting
        sessionStorage.setItem('returnToBillingTab', 'true');
        // Direct redirect without page reload
        window.location.assign(result.url);
      } else {
        throw new Error('No portal URL returned.');
      }
    } catch (error: any) {
      console.error('Error processing plan change:', error);
      toast.error(`Failed to change plan: ${error.message}`);
      setIsLoading(false); // Reset loading state on error
    }
  };

  // Function to handle trial cancellation
  const handleCancelTrial = async () => {
    setIsCancelingTrial(true);
    try {
      // Get a fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("Authentication error: No active session");
      }
      
      console.log(`Canceling subscription ${stripeSubscriptionId}`);

      // Make the API call with the token in the Authorization header
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscriptionId: stripeSubscriptionId || null })
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError: any) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Failed to parse server response: ${parseError.message || 'Unknown error'}`);
      }

      // Handle the response
      if (!response.ok) {
        console.error('Cancel trial API error:', result);
        throw new Error(result.error || `Failed to cancel trial: Server returned ${response.status}`);
      }

      console.log('Cancel trial success:', result);

      toast.success("Trial cancelled successfully. Your plan has been set to Post Trial.");

      // Update local state immediately
      setCurrentPlan(PLANS.POST_TRIAL);
      setSubscriptionStatus('canceled');
      setTrialEndDate(null);
      setStripeSubscriptionId(null);
      
      // Notify other components (like layout) that subscription has been updated
      window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
      
      // Force refresh to re-fetch updated subscription data after a short delay
      // This ensures the database has been updated before we fetch
      setTimeout(() => {
        fetchSubscriptionData();
      }, 2000);
    } catch (error: any) {
      console.error('Error canceling trial:', error);
      
      // Provide a user-friendly error message
      let errorMessage = 'Failed to cancel trial';
      if (error.message) {
        // Clean up error message for display
        const cleanMessage = error.message
          .replace(/^Error: /, '')
          .replace(/\bstripe\b/i, 'payment processor');
        errorMessage = `${errorMessage}: ${cleanMessage}`;
      }
      
      toast.error(errorMessage);
      
      // If the error indicates the subscription doesn't exist, update the UI anyway
      if (error.message && (error.message.includes('No such subscription') || 
                           error.message.includes('resource_missing') || 
                           error.message.includes('not found'))) {
        console.log('Subscription appears to be already canceled, updating UI state');
        setCurrentPlan(PLANS.POST_TRIAL);
        setSubscriptionStatus('canceled');
        setTrialEndDate(null);
        setStripeSubscriptionId(null);
        
        // Notify other components (like layout) that subscription has been updated
        window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
        
        // Refresh data from backend
        setTimeout(() => {
          fetchSubscriptionData();
        }, 1000);
      }
    } finally {
      setIsCancelingTrial(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      toast.error("Could not find customer details to manage subscription.");
      return;
    }
    setIsManagingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication error.");
      }

      const response = await fetch('/api/stripe/customer-portal', { // updated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create customer portal link.');
      }

      // Redirect to the Stripe Customer Portal
      if (result.url) {
        // Store the current tab in sessionStorage before redirecting
        sessionStorage.setItem('returnToBillingTab', 'true');
        // Direct redirect without page reload
        window.location.assign(result.url);
      } else {
        throw new Error('No portal URL returned.');
      }
    } catch (error: any) {
      console.error('Error creating Stripe portal link:', error);
      toast.error(`Failed to manage subscription: ${error.message}`);
      setIsManagingSubscription(false); // Reset state on error
    } 
    // No finally needed to reset state, as successful redirect navigates away
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Get the current session to extract the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Authentication error: No active session');
        return;
      }
      
      // Make the DELETE request with the Authorization header
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result);
        toast.error(`Failed to delete account: ${result.error || 'Unknown error'}`);
      } else {
        toast.success("Account deleted successfully. Signing out...");
        
        // Sign out and redirect in sequence
        try {
          // First sign out from Supabase
          await supabase.auth.signOut();
          
          // Then redirect to home page
          window.location.href = '/'; // Use direct location change for a complete page refresh
        } catch (signOutError) {
          console.error("Error during sign out:", signOutError);
          // Even if sign out fails, still redirect to home page
          window.location.href = '/';
        }
      }
    } catch (error: any) { // Catch network or unexpected errors
      console.error("Delete request failed:", error);
      toast.error(`An error occurred: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Only show a login message if there's no user at all
  if (!user) {
     return <div className="container mx-auto p-4 md:p-6 text-center">Please log in to view your account settings.</div>;
  }
  return (
    <div className="p-6">

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="account">Overview</TabsTrigger>
          <TabsTrigger value="billing">Plan & Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <div className="space-y-6">
            {/* Analytics Overview Section */}
            <div>
              <AnalyticsOverview user={user} />
            </div>

            <Card className="py-6">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <Input 
                    id="name" 
                    value={fullName || ''} 
                    onChange={(e) => setFullName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input 
                    id="email" 
                    value={email || ''} 
                    onChange={(e) => setEmail(e.target.value)} 
                    // Email change requires confirmation via link sent to the new address
                  /> 
                </div>
                {!passwordChangeMode ? (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setPasswordChangeMode(true)}
                      type="button"
                    >
                      Change Password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 border p-4 rounded-md">
                    <h3 className="font-medium">Change Password</h3>
                    <div className="space-y-2">
                      <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
                      <Input 
                        id="currentPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        placeholder="At least 8 characters" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <PasswordStrengthIndicator 
                        password={newPassword} 
                        showErrors={false}
                        className="mt-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setPasswordChangeMode(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        type="button"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleSaveAccount} 
                        disabled={isSaving || (newPassword ? !validatePassword(newPassword).isValid : false)}
                      >
                        {isSaving ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                )}
                <Button onClick={handleSaveAccount} disabled={isSaving || passwordChangeMode}>
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="py-6">
              <CardHeader>
                <CardTitle>Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Delete account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your 
                        account and remove all your associated data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={confirmDeleteAccount} 
                        disabled={isDeleting} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-sm text-muted-foreground mt-4">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-6">
          {/* Show loading state while data is being fetched */}
          {!billingDataLoaded ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading billing information...</p>
              </div>
            </div>
          ) : (
          <div className="space-y-6">
              {/* Expired Trial Alert */}
              {subscriptionStatus === 'expired' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Trial Expired</AlertTitle>
                  <AlertDescription>
                    Your trial period has ended. Please upgrade to a paid plan to continue using your chatbot.
                  </AlertDescription>
                </Alert>
              )}

              {/* Canceled Trial Alert */}
              {subscriptionStatus === 'canceled' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Trial Canceled</AlertTitle>
                  <AlertDescription>
                    Your trial has been canceled. Your chatbot is now inactive. Please upgrade to a paid plan to reactivate your chatbot.
                  </AlertDescription>
                </Alert>
              )}

              {/* Trial Card - Only show if actively trialing AND not expired AND not canceled */}
              {(() => {
                const shouldShow = subscriptionStatus === 'trialing' && trialEndDate && !isTrialExpired(subscriptionStatus, trialEndDate.toISOString());
                console.log('[Trial Banner Debug]', {
                  subscriptionStatus,
                  trialEndDate,
                  trialEndDateISO: trialEndDate?.toISOString(),
                  isTrialExpiredResult: trialEndDate ? isTrialExpired(subscriptionStatus, trialEndDate.toISOString()) : 'no date',
                  shouldShow
                });
                return shouldShow;
              })() && (
                <Card className="py-6 flex flex-col md:flex-row">
                  <CardHeader className="flex-grow">
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      You are currently on a trial
                    </CardTitle>
                    <CardDescription className="pt-2 text-sm text-gray-700 max-w-[800px]">
                      You have{' '}
                      <span className="inline-block min-w-[20px] text-center"> 
                        {isLoadingUsage || !usageData ? (
                          <Loader2 className="h-4 w-4 animate-spin inline-block" /> 
                        ) : (
                          <>
                            {usageData.messageCredits.total - usageData.messageCredits.used} / {usageData.messageCredits.total}
                          </>
                        )}
                      </span>{' '}message credits left.
                      If you'd like to remove this limit, you can already upgrade your plan manually or wait until the trial ends 
                      on {trialEndDate ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(trialEndDate) : 'unknown date'} to be upgraded automatically. Cancelling during the trial will result in no charges.                  
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="md:mt-0 md:ml-auto flex flex-col justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="align-right" disabled={isCancelingTrial}>
                          {isCancelingTrial ? 'Canceling...' : 'Cancel Trial'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to cancel your trial?</AlertDialogTitle>
                          <AlertDialogDescription className="mb-4">
                            WARNING: This action cannot be undone. Canceling will immediately disable your chatbot
                            and you will lose access to paid features. Your chatbot will stop responding
                            to users unless you upgrade to a plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Trial</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCancelTrial} 
                            disabled={isCancelingTrial} 
                            className="bg-destructive text-white hover:bg-destructive/90">
                            {isCancelingTrial ? 'Canceling...' : 'Yes, Cancel Trial'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              )}

              {/* Pricing Table */}
              {subscriptionStatus !== 'expired' && (
                <PricingTable 
                  currentPlan={currentPlan} 
                  onUpgrade={handleUpgrade} // External handler for non-trial upgrades
                  isLoading={isLoading} // Pass the general loading state
                  isTrialMode={subscriptionStatus === 'trialing'} // Tell component if user is trialing
                  stripeSubscriptionId={stripeSubscriptionId} // Pass subscription ID for trial upgrades
                  subscriptionStatus={subscriptionStatus}
                />
              )}

              {/* Manage Subscription Button (shown for active, canceling plans - not for canceled trials) */}
              {['active', 'canceling'].includes(subscriptionStatus || '') && (
                <div className="mt-6">
                  <Card className="py-6">
                    <CardHeader>
                      <CardTitle>Manage Your Subscription</CardTitle>
                      <CardDescription>
                        View invoices, update payment methods, and manage your subscription
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={handleManageSubscription} 
                        disabled={isManagingSubscription}
                      >
                        {isManagingSubscription ? 'Opening Portal...' : 'Manage Subscription or Download Invoices'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
          </TabsContent>
      </Tabs>
    </div>
  );
}
