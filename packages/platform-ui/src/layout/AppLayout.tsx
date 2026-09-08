import { Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';

import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Backdrop from './Backdrop';
import type { SidebarConfig } from './types';

type AppLayoutProps = {
  config: SidebarConfig;
};

const LayoutContent: React.FC<AppLayoutProps> = ({ config }) => {
  const { isExpanded, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar config={config} />
        <Backdrop />
      </div>
      <div
        className={cn(
          'flex-1 transition-[margin] duration-300 ease-in-out',
          isExpanded ? 'lg:ms-[260px]' : 'lg:ms-[72px]',
          isMobileOpen && 'ms-0'
        )}
      >
        <AppHeader />

        <div className="mx-auto max-w-(--breakpoint-2xl) p-5 md:p-8">
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
