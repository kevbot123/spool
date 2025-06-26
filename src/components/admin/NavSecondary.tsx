'use client';

import { Calendar, Trash2, HelpCircle, FileText, MapPinned, UsersRound, UserRoundCog, Cog } from 'lucide-react';
import { LuRocket } from "react-icons/lu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS } from '@/lib/config/pricing';

const items = [
//   {
//     title: 'Calendar',
//     url: '/calendar',
//     icon: Calendar,
//   },
  {
    title: 'Team members',
    url: '/trash',
    icon: UserRoundCog,
  },
  {
    title: 'Site settings',
    url: '/trash',
    icon: Cog,
  },
  {
    title: 'Sitemap',
    url: '/trash',
    icon: MapPinned,
  },
  {
    title: 'Help',
    url: '/help',
    icon: HelpCircle,
  },
];

export function NavSecondary() {
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      setIsLoading(false);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (token) {
          const syncResponse = await fetch('/api/stripe/sync-subscription', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            
            setSubscriptionStatus(syncData.status);
            
            // Determine current plan for display/logic
            if (syncData.status === 'trialing') {
              setSubscriptionPlan(PLANS.FREE);
            } else if (syncData.status === 'active' || syncData.status === 'canceling') {
              setSubscriptionPlan(syncData.plan_id);
            } else if (syncData.status === 'canceled' || syncData.status === 'expired') {
              setSubscriptionPlan(PLANS.POST_TRIAL);
            } else {
              setSubscriptionPlan(null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      }
    };

    if (user) {
      fetchSubscriptionData();
    }
  }, [user, supabase]);

  // Check if we should show the upgrade button
  const shouldShowUpgrade = !isLoading && (
    subscriptionPlan === PLANS.FREE || 
    subscriptionPlan === PLANS.POST_TRIAL || 
    (subscriptionStatus && ['canceled', 'expired', 'past_due', 'unpaid'].includes(subscriptionStatus))
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {shouldShowUpgrade && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/account?tab=billing" className="text-primary">
                  <LuRocket />
                  <span>Upgrade</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
} 