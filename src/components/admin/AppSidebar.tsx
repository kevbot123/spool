'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { NavFavorites } from './NavFavorites';
import { NavMain } from './NavMain';
import { NavSecondary } from './NavSecondary';
import { NavWorkspaces } from './NavWorkspaces';
import { TeamSwitcher } from './TeamSwitcher';
import { NavUser } from './NavUser';

export function AppSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain /> */}
        <SidebarSeparator className="mx-0 mb-[-2px]" />
        <NavFavorites />
        <SidebarSeparator className="mx-0" />
    {/* <NavWorkspaces />
        <SidebarSeparator className="mx-0" /> */}
        <NavSecondary />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
} 