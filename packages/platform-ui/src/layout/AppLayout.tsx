import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';

import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Backdrop from './Backdrop';
import { filterSidebarItems, type SidebarConfig } from './types';

export type AppLayoutProps = {
  config: SidebarConfig;
};

const LayoutContent: React.FC<AppLayoutProps> = ({ config }) => {
  const { isExpanded, isMobileOpen } = useSidebar();

  const sidebarConfig = useMemo<SidebarConfig>(
    () => ({
      ...config,
      navItems: filterSidebarItems(config.navItems, config.permissions),
      othersItems: filterSidebarItems(config.othersItems ?? [], config.permissions),
    }),
    [config]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 xl:flex">
      <div>
        <AppSidebar config={sidebarConfig} />
        <Backdrop />
      </div>
      <div
        className={cn(
          'flex-1 bg-white transition-[margin] duration-300 ease-in-out dark:bg-gray-950',
          isExpanded ? 'lg:ms-[260px]' : 'lg:ms-[72px]',
          isMobileOpen && 'ms-0'
        )}
      >
        <AppHeader config={config.header} projectDetails={config.projectDetails} />

        <div className={cn('mx-auto max-w-(--breakpoint-2xl) p-5 md:p-8', config.contentClassName)}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ config }) => {
  return (
    <SidebarProvider>
      <LayoutContent config={config} />
    </SidebarProvider>
  );
};

export default AppLayout;
