'use client';

import { Folder, MoreHorizontal, ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

const workspaces = [
  {
    name: 'Site Management',
    emoji: '🏠',
    pages: [
      {
        name: 'Site Settings',
        url: '/admin/settings',
        emoji: '⚙️',
      },
      {
        name: 'Domain Configuration',
        url: '/admin/domains',
        emoji: '🌐',
      },
      {
        name: 'Media Library',
        url: '/admin/media',
        emoji: '📁',
      },
      {
        name: 'Backup & Restore',
        url: '/admin/backup',
        emoji: '💾',
      },
    ],
  },
  {
    name: 'Content Management',
    emoji: '📝',
    pages: [
      {
        name: 'Templates',
        url: '/admin/templates',
        emoji: '📄',
      },
      {
        name: 'Content Types',
        url: '/admin/content-types',
        emoji: '🏗️',
      },
      {
        name: 'SEO Settings',
        url: '/admin/seo',
        emoji: '🔍',
      },
    ],
  },
  {
    name: 'Collaboration',
    emoji: '👥',
    pages: [
      {
        name: 'Team Members',
        url: '/admin/team',
        emoji: '👤',
      },
      {
        name: 'Permissions',
        url: '/admin/permissions',
        emoji: '🔐',
      },
      {
        name: 'Activity Log',
        url: '/admin/activity',
        emoji: '📋',
      },
    ],
  },
];

export function NavWorkspaces() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupAction>
        <MoreHorizontal />
        <span className="sr-only">More</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {workspaces.map((workspace) => (
          <Collapsible key={workspace.name} asChild defaultOpen={false}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={workspace.name}>
                <CollapsibleTrigger>
                  <span className="mr-2">{workspace.emoji}</span>
                  <span>{workspace.name}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarMenuButton>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {workspace.pages.map((page) => (
                    <SidebarMenuSubItem key={page.name}>
                      <SidebarMenuSubButton asChild>
                        <Link href={page.url}>
                          <span className="mr-2">{page.emoji}</span>
                          <span>{page.name}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
} 