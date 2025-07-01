'use client';

import { ReactNode, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppSidebar } from '@/components/admin/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { AdminHeaderProvider, useAdminHeader } from '@/context/AdminHeaderContext';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { EmailVerificationBanner } from '@/components/email-verification-banner';
import { AlertBanner } from '@/components/alert-banner';
import { isTrialExpired } from '@/lib/utils';

interface AdminLayoutClientProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { headerContent, breadcrumbs } = useAdminHeader();

  // Subscription banner state and logic
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [showExpiredTrialBanner, setShowExpiredTrialBanner] = useState(false);
  const [showCancelingBanner, setShowCancelingBanner] = useState(false);

  // Track last sync time to throttle frequent syncs
  const lastSyncTimeRef = useRef<number>(0);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const fallbackFetchSubscriptionData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('plan_id, status, trial_ends_at, stripe_subscription_id, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && customerData) {
        setCustomerData(customerData);
        setShowExpiredTrialBanner(isTrialExpired(customerData.trial_ends_at) || customerData.status === 'canceled');
        setShowCancelingBanner(customerData.status === 'canceling');
      }
    } catch (err) {
      console.error('[AdminLayout] Fallback subscription fetch error:', err);
    }
  }, [supabase]);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const { data: { session, user } } = await supabase.auth.getSession();
      if (!user) {
        setIsLoading(false);
        return;
      }
      const token = session?.access_token;
      if (!token) {
        setIsLoading(false);
        return;
      }
      const resp = await fetch('/api/stripe/sync-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setCustomerData(data);
        setShowExpiredTrialBanner(
          isTrialExpired(data.trial_ends_at) || data.status === 'canceled'
        );
        setShowCancelingBanner(data.status === 'canceling');
      } else {
        await fallbackFetchSubscriptionData();
      }
    } catch (error) {
      console.warn('[AdminLayout] Primary subscription sync failed, trying fallback');
      await fallbackFetchSubscriptionData();
      console.error('[AdminLayout] Error fetching subscription:', error);
    } finally {
      lastSyncTimeRef.current = Date.now();
      setIsLoading(false);
    }
  }, [supabase, fallbackFetchSubscriptionData]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Throttled refresh on window focus
  useEffect(() => {
    const handleWindowFocus = () => {
      const now = Date.now();
      const thirtySeconds = 30 * 1000;
      if (now - lastSyncTimeRef.current > thirtySeconds) {
        fetchSubscriptionData();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [fetchSubscriptionData]);

  // Refresh banners when subscription is updated elsewhere
  useEffect(() => {
    const handler = () => fetchSubscriptionData();
    window.addEventListener('subscriptionUpdated', handler);
    return () => window.removeEventListener('subscriptionUpdated', handler);
  }, [fetchSubscriptionData]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Alert Banners */}
        <div className="mx-auto">
          {/* Email verification banner */}
          <EmailVerificationBanner />
          {/* Removed block for 'cancelingPlan' for trial cancellation - relying on showExpiredTrialBanner logic below */}
          {/* This block now correctly handles showing the banner when status is 'canceled' */}
          {!isLoading && showExpiredTrialBanner && (
            <div>
              {/* @ts-ignore */}
              <AlertBanner type="expiredTrial" />
            </div>
          )}
          {!isLoading && showCancelingBanner && (customerData?.trial_ends_at || customerData?.current_period_end) && (
            <div>
              {/* @ts-ignore */}
              <AlertBanner
                type="cancelingPlan"
                daysRemaining={Math.ceil(
                  (
                    new Date(
                      customerData.trial_ends_at || customerData.current_period_end
                    ).getTime() - new Date().getTime()
                  ) /
                    (1000 * 60 * 60 * 24)
                )}
              />
            </div>
          )}
        </div>
        <header className="flex h-[60px] shrink-0 items-center gap-2 border-b bg-white min-w-0">
          <div className="flex flex-1 items-center gap-2 px-4 min-w-0">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <BreadcrumbItem key={index}>
                    {breadcrumb.href && index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumb.href} className="line-clamp-1">
                          {breadcrumb.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="line-clamp-1">
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {headerContent && (
            <div className="flex items-center gap-2 px-4 shrink-0">
              {headerContent}
            </div>
          )}
        </header>
        <div className="flex flex-1 flex-col min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayoutClient({
  children
}: AdminLayoutClientProps) {
  return (
    <AdminHeaderProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminHeaderProvider>
  );
} 