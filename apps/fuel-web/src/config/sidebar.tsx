import type { SidebarConfig } from '@companyio/platform-ui';
import type { FuelRole } from '@companyio/auth-contracts';

import { BoxCubeIcon, DollarLineIcon, GridIcon, GroupIcon, PlugInIcon, UserCircleIcon } from '@companyio/platform-ui';
import { canAccessPath } from '../features/auth/roles';

export const sidebarConfig: SidebarConfig = {
  projectDetails: {
    name: 'Fuel Management',
    logo: '',
    darkLogo: '',
    collapsedLogo: '/images/logo/logo-icon.svg',
    logoWidth: 150,
    logoHeight: 40,
  },
  navItems: [
    {
      icon: <GridIcon />,
      name: 'Dashboard',
      subItems: [
        {
          name: 'Overview',
          path: '/',
        },
      ],
    },
    {
      icon: <DollarLineIcon />,
      name: 'Sales & Credit',
      subItems: [
        { name: 'Fuel sales', path: '/sales' },
        { name: 'Fleet sales', path: '/fleet-sales' },
        { name: 'Organizations', path: '/organizations' },
        { name: 'Customers', path: '/customers' },
        { name: 'Vehicles', path: '/vehicles' },
        { name: 'Credit accounts', path: '/credit-accounts' },
        { name: 'Payments', path: '/payments' },
      ],
    },
    {
      icon: <BoxCubeIcon />,
      name: 'Operations',
      subItems: [
        { name: 'Daily opening', path: '/opening' },
        { name: 'Inventory', path: '/inventory' },
        { name: 'Tanker receiving', path: '/fuel-purchases' },
        { name: 'Expenses', path: '/expenses' },
      ],
    },
    {
      icon: <PlugInIcon />,
      name: 'Settings',
      subItems: [
        { name: 'Pump profile', path: '/settings/pump' },
        { name: 'Products', path: '/settings/products' },
        { name: 'Tanks & meters', path: '/settings/tanks' },
        { name: 'Denominations', path: '/settings/denominations' },
        { name: 'Selling rates', path: '/settings/rates' },
      ],
    },
    {
      icon: <GridIcon />,
      name: 'Reports',
      path: '/reports',
    },
  ],

  othersItems: [
    {
      icon: <GroupIcon />,
      name: 'Users',
      path: '/users',
    },
    {
      icon: <UserCircleIcon />,
      name: 'User Profile',
      path: '/profile',
    },
  ],
};

const visibleItems = (items: SidebarConfig['navItems'], role: FuelRole) =>
  items
    .map((item) => {
      if (item.subItems) {
        const subItems = item.subItems.filter((subItem) => canAccessPath(role, subItem.path));
        return subItems.length > 0 ? { ...item, subItems } : null;
      }
      return item.path && canAccessPath(role, item.path) ? item : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

export const sidebarForRole = (role: FuelRole): SidebarConfig => ({
  ...sidebarConfig,
  navItems: visibleItems(sidebarConfig.navItems, role),
  othersItems: visibleItems(sidebarConfig.othersItems, role),
});
