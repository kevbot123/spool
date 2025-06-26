'use client';

import { ChevronsUpDown, Plus, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useSite } from '@/context/SiteContext';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import Link from 'next/link';

interface FaviconAvatarProps {
  domain?: string;
  siteName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function FaviconAvatar({ domain, siteName, className = "h-8 w-8 rounded-lg", size = 'md' }: FaviconAvatarProps) {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);

  const getSiteInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const constructFaviconUrl = (domain: string) => {
    // Remove protocol if present and ensure we have a clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    // Try common favicon paths
    return `https://${cleanDomain}/favicon.ico`;
  };

  useEffect(() => {
    if (!domain) {
      setFaviconUrl(null);
      return;
    }

    const tryFavicon = async () => {
      try {
        const url = constructFaviconUrl(domain);
        
        // Create a promise that resolves when the image loads or rejects when it errors
        const imageLoadPromise = new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => reject(new Error('Favicon not found'));
          img.src = url;
        });

        // Set a timeout to avoid hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 3000);
        });

        const faviconUrl = await Promise.race([imageLoadPromise, timeoutPromise]);
        setFaviconUrl(faviconUrl);
        setFaviconError(false);
      } catch (error) {
        setFaviconError(true);
        setFaviconUrl(null);
      }
    };

    tryFavicon();
  }, [domain]);

  // If we have a favicon URL and no error, show the favicon
  if (faviconUrl && !faviconError && domain) {
    const sizeClasses = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-8 w-8' : 'h-8 w-8';
    return (
      <img
        src={faviconUrl}
        alt={`${siteName} favicon`}
        className={`${sizeClasses} rounded-lg object-contain bg-white border border-gray-200`}
        onError={() => {
          setFaviconError(true);
          setFaviconUrl(null);
        }}
      />
    );
  }

  // Fall back to avatar with initials
  return (
    <Avatar className={className}>
      <AvatarFallback className={size === 'sm' ? 'rounded-sm text-xs' : 'rounded-lg'}>
        {getSiteInitials(siteName)}
      </AvatarFallback>
    </Avatar>
  );
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const { currentSite, sites, isLoading, setCurrentSite } = useSite();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    getUser();
  }, [supabase]);

  const handleSiteSelect = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      setCurrentSite(site);
    }
  };

  const handleCreateSite = () => {
    router.push('/admin/setup');
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to sign out');
      }
      
      toast.success('Signed out successfully');
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const getSiteInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const;
      case 'admin':
        return 'secondary' as const;
      case 'editor':
        return 'outline' as const;
      case 'viewer':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-3 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (sites.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" onClick={handleCreateSite}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Create your first site</span>
              <span className="truncate text-xs">Get started</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <FaviconAvatar 
                domain={currentSite?.domain} 
                siteName={currentSite?.name || 'Site'}
                className="h-8 w-8 rounded-lg"
                size="md"
              />

                <div className="grid flex-1">
                  <span className="font-medium text-sm">{currentSite?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentSite?.domain?.replace(/^https?:\/\//, '') || 'No domain'}
                  </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sites
            </DropdownMenuLabel>
            {sites.map((site) => (
              <DropdownMenuItem
                key={site.id}
                onClick={() => handleSiteSelect(site.id)}
                className="gap-2 p-2"
              >
                <FaviconAvatar 
                  domain={site.domain} 
                  siteName={site.name}
                  className="h-6 w-6 rounded-sm"
                  size="sm"
                />
                <div className="grid flex-1">
                  <span className="font-medium text-sm">{site.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {site.domain?.replace(/^https?:\/\//, '') || 'No domain'}
                  </span>
                </div>
                {currentSite?.id === site.id && (
                  <DropdownMenuShortcut>✓</DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem onClick={handleCreateSite} className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div>Add site</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Account
            </DropdownMenuLabel>
            {/* <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || user?.email?.split('@')[0] || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email || 'Loading...'}</p>
              </div>
            </DropdownMenuLabel> */}
            <DropdownMenuItem asChild>
              <Link href="/admin/account?tab=account">
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
} 