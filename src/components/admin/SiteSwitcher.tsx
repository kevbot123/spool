'use client';

import { ChevronDown, Plus, Building2, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useSite } from '@/context/SiteContext';

export function SiteSwitcher() {
  const { currentSite, sites, isLoading, setCurrentSite } = useSite();
  const router = useRouter();

  const handleSiteSelect = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      setCurrentSite(site);
    }
  };

  const handleCreateSite = () => {
    router.push('/admin/setup');
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
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-8 h-8 bg-gray-200 rounded-md animate-pulse" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <Button
        variant="ghost"
        onClick={handleCreateSite}
        className="w-full justify-start p-3 h-auto"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Create your first site</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                {currentSite ? getSiteInitials(currentSite.name) : 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">
                {currentSite?.name || 'Select Site'}
              </div>
              {currentSite && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant={getRoleBadgeVariant(currentSite.role)} className="text-xs">
                    {currentSite.role}
                  </Badge>
                  {currentSite.domain && (
                    <span className="text-xs text-gray-500 truncate">
                      {currentSite.domain.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Your Sites
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sites.map((site) => (
          <DropdownMenuItem
            key={site.id}
            onClick={() => handleSiteSelect(site.id)}
            className="p-3 cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                  {getSiteInitials(site.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{site.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={getRoleBadgeVariant(site.role)} className="text-xs">
                    {site.role}
                  </Badge>
                  {site.domain && (
                    <span className="text-xs text-gray-500 truncate">
                      {site.domain.replace(/^https?:\/\//, '')}
                    </span>
                  )}
                </div>
              </div>
              {currentSite?.id === site.id && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCreateSite} className="p-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
            <span className="text-sm font-medium">Create new site</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push('/account')} className="p-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium">Account Settings</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 