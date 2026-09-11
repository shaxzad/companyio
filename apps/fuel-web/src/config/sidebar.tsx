import {
  buildSidebarFromRoutes,
  type HeaderUser,
  type SidebarConfig,
} from '@companyio/platform-ui';
import type { FuelRole } from '@companyio/auth-contracts';

import { canAccessPath } from '../features/auth/roles';
import { fuelRoutes } from './routes';

const projectDetails: SidebarConfig['projectDetails'] = {
  name: 'Fuel Management',
  logo: '',
  darkLogo: '',
  collapsedLogo: '/images/logo/logo-icon.svg',
  logoWidth: 150,
  logoHeight: 40,
  href: '/',
};

const headerBase: NonNullable<SidebarConfig['header']> = {
  search: false,
  showNotifications: true,
  showThemeToggle: false,
  showThemeInUserMenu: true,
  avatarOnly: true,
  notificationCount: 0,
  userMenuItems: [
    { key: 'settings', label: 'Settings', path: '/settings/pump' },
    { key: 'profile', label: 'Profile', path: '/profile' },
  ],
};

/** Routes visible in the menu for a given fuel role (path access matrix). */
const menuRoutesForRole = (role: FuelRole) =>
  fuelRoutes.filter((route) => {
    if (route.redirectTo) return false;
    if (route.person || route.apply) return false;
    return canAccessPath(role, route.path);
  });

export const sidebarForRole = (role: FuelRole, user?: HeaderUser): SidebarConfig => {
  const { navItems, othersItems } = buildSidebarFromRoutes(menuRoutesForRole(role));

  return {
    projectDetails,
    navItems,
    othersItems,
    header: {
      ...headerBase,
      ...(user
        ? {
            user: {
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
            },
          }
        : {}),
    },
  };
};

/** Static snapshot (owner-level) for demos / Storybook-style usage. */
export const sidebarConfig: SidebarConfig = sidebarForRole('owner');
