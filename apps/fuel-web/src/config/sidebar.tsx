import type { SidebarConfig } from '@companyio/platform-ui';

import { BoxCubeIcon, DollarLineIcon, GridIcon, UserCircleIcon } from '@companyio/platform-ui';

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
        { name: 'Daily sales', path: '/sales' },
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
        { name: 'Inventory', path: '/inventory' },
        { name: 'Fuel purchases', path: '/fuel-purchases' },
        { name: 'Expenses', path: '/expenses' },
        { name: 'Pumps & tanks', path: '/assets' },
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
      icon: <UserCircleIcon />,
      name: 'User Profile',
      path: '/profile',
    },
  ],
};
