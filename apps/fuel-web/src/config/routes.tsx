import {
  BoxCubeIcon,
  DollarLineIcon,
  GridIcon,
  GroupIcon,
  MenuPositions,
  PlugInIcon,
  UserCircleIcon,
  type AppRouteModule,
} from '@companyio/platform-ui';

import Home from '../pages/Dashboard/Home';
import UserProfiles from '../pages/UserProfiles';
import FuelModulePage from '../pages/FuelModulePage';
import FuelRecordPage from '../pages/FuelRecordPage';
import UsersPage from '../features/users/UsersPage';
import UserFormPage from '../features/users/UserFormPage';
import PumpProfilePage from '../features/settings/PumpProfilePage';
import ProductsPage from '../features/settings/ProductsPage';
import TanksMetersPage from '../features/settings/TanksMetersPage';
import DenominationsPage from '../features/settings/denominations/DenominationsPage';
import RatesPage from '../features/settings/RatesPage';
import DailyOpeningPage from '../features/opening/DailyOpeningPage';
import MeterSalesPage from '../features/sales/MeterSalesPage';
import ReceivingPage from '../features/receiving/ReceivingPage';
import CompaniesPage from '../features/companies/CompaniesPage';
import VehiclesPage from '../features/companies/VehiclesPage';
import CreditSalePage from '../features/credit/CreditSalePage';
import CreditInvoicePage from '../features/credit/CreditInvoicePage';
import CompanyLedgerPage from '../features/credit/CompanyLedgerPage';

/**
 * Fuel app route modules — single source of truth for React Router + sidebar.
 * Shape mirrors the shared `IRouteModule` style (key, path, auth, position, permissions, …).
 *
 * `person` / `apply` may be declared as placeholders; they are not implemented yet.
 */
export const fuelRoutes: AppRouteModule[] = [
  {
    key: 'dashboard-home',
    name: 'Overview',
    path: '/',
    element: <Home />,
    icon: <GridIcon />,
    group: 'dashboard',
    groupName: 'Dashboard',
    groupIcon: <GridIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['*'],
    priority: 0,
    index: true,
  },
  {
    key: 'profile',
    name: 'User Profile',
    path: '/profile',
    element: <UserProfiles />,
    icon: <UserCircleIcon />,
    position: MenuPositions.Lower,
    auth: true,
    permissions: ['*'],
    priority: 20,
  },
  {
    key: 'users',
    name: 'Users',
    path: '/users',
    element: <UsersPage />,
    icon: <GroupIcon />,
    position: MenuPositions.Lower,
    auth: true,
    permissions: ['users.manage'],
    priority: 10,
  },
  {
    key: 'users-new',
    name: 'New user',
    path: '/users/new',
    element: <UserFormPage />,
    hideInMenu: true,
    auth: true,
    permissions: ['users.manage'],
  },
  {
    key: 'users-edit',
    name: 'Edit user',
    path: '/users/:userId',
    element: <UserFormPage />,
    hideInMenu: true,
    auth: true,
    permissions: ['users.manage'],
  },
  {
    key: 'fuel-sales',
    name: 'Fuel sales',
    path: '/sales',
    element: <MeterSalesPage />,
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['sales.read'],
    priority: 1,
  },
  {
    key: 'fleet-sales',
    name: 'Credit sales',
    path: '/fleet-sales',
    element: <CreditSalePage />,
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['sales.read'],
    priority: 2,
  },
  {
    key: 'credit-invoice',
    name: 'Credit invoice',
    path: '/credit-sales/:saleId/invoice',
    element: <CreditInvoicePage />,
    hideInMenu: true,
    auth: true,
    permissions: ['sales.read'],
  },
  {
    key: 'organizations',
    name: 'Companies',
    path: '/organizations',
    element: <CompaniesPage />,
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['credit.read'],
    priority: 3,
  },
  {
    key: 'customers',
    name: 'Customers',
    path: '/customers',
    redirectTo: '/organizations',
    hideInMenu: true,
    auth: true,
    permissions: ['credit.read'],
  },
  {
    key: 'vehicles',
    name: 'Vehicles',
    path: '/vehicles',
    element: <VehiclesPage />,
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['credit.read'],
    priority: 5,
  },
  {
    key: 'credit-accounts',
    name: 'Company ledger',
    path: '/credit-accounts',
    element: <CompanyLedgerPage />,
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['credit.read'],
    priority: 6,
  },
  {
    key: 'payments',
    name: 'Payments',
    path: '/payments',
    element: (
      <FuelRecordPage
        title="Payments"
        description="Record customer payments and reconcile outstanding organization balances."
        endpoint="/fuel/payments"
        fields={[
          { name: 'stationId', label: 'Station', required: true },
          { name: 'organizationId', label: 'Organization', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          {
            name: 'method',
            label: 'Payment method',
            required: true,
            options: [
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK', label: 'Bank' },
              { value: 'CARD', label: 'Card' },
              { value: 'TRANSFER', label: 'Transfer' },
            ],
          },
          { name: 'reference', label: 'Reference' },
        ]}
      />
    ),
    group: 'sales-credit',
    groupName: 'Sales & Credit',
    groupIcon: <DollarLineIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['credit.read'],
    priority: 7,
  },
  {
    key: 'opening',
    name: 'Daily opening',
    path: '/opening',
    element: <DailyOpeningPage />,
    group: 'operations',
    groupName: 'Operations',
    groupIcon: <BoxCubeIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['operations.read'],
    priority: 8,
  },
  {
    key: 'inventory',
    name: 'Inventory',
    path: '/inventory',
    element: (
      <FuelModulePage
        title="Inventory"
        description="Track tank stock, receipts, sales, adjustments, and physical reconciliation."
      />
    ),
    group: 'operations',
    groupName: 'Operations',
    groupIcon: <BoxCubeIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['operations.read'],
    priority: 9,
  },
  {
    key: 'receiving',
    name: 'Tanker receiving',
    path: '/fuel-purchases',
    element: <ReceivingPage />,
    group: 'operations',
    groupName: 'Operations',
    groupIcon: <BoxCubeIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['operations.read'],
    priority: 10,
  },
  {
    key: 'expenses',
    name: 'Expenses',
    path: '/expenses',
    element: (
      <FuelRecordPage
        title="Expenses"
        description="Record station expenses, payment accounts, approvals, and receipts."
        endpoint="/fuel/expenses"
        fields={[
          { name: 'stationId', label: 'Station', required: true },
          { name: 'category', label: 'Category', required: true },
          { name: 'description', label: 'Description', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          {
            name: 'method',
            label: 'Payment method',
            required: true,
            options: [
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK', label: 'Bank' },
              { value: 'CARD', label: 'Card' },
              { value: 'TRANSFER', label: 'Transfer' },
            ],
          },
          { name: 'reference', label: 'Reference' },
        ]}
      />
    ),
    group: 'operations',
    groupName: 'Operations',
    groupIcon: <BoxCubeIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['operations.read'],
    priority: 11,
  },
  {
    key: 'settings-pump',
    name: 'Pump profile',
    path: '/settings/pump',
    element: <PumpProfilePage />,
    group: 'settings',
    groupName: 'Settings',
    groupIcon: <PlugInIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['settings.read'],
    priority: 12,
  },
  {
    key: 'settings-products',
    name: 'Products',
    path: '/settings/products',
    element: <ProductsPage />,
    group: 'settings',
    groupName: 'Settings',
    groupIcon: <PlugInIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['settings.read'],
    priority: 13,
  },
  {
    key: 'settings-tanks',
    name: 'Tanks & meters',
    path: '/settings/tanks',
    element: <TanksMetersPage />,
    group: 'settings',
    groupName: 'Settings',
    groupIcon: <PlugInIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['settings.read'],
    priority: 14,
  },
  {
    key: 'settings-denominations',
    name: 'Cash notes',
    path: '/settings/denominations',
    element: <DenominationsPage />,
    group: 'settings',
    groupName: 'Settings',
    groupIcon: <PlugInIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['settings.read'],
    priority: 15,
  },
  {
    key: 'settings-rates',
    name: 'Selling rates',
    path: '/settings/rates',
    element: <RatesPage />,
    group: 'settings',
    groupName: 'Settings',
    groupIcon: <PlugInIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['settings.read'],
    priority: 16,
  },
  {
    key: 'reports',
    name: 'Reports',
    path: '/reports',
    element: (
      <FuelModulePage
        title="Reports"
        description="Review sales, inventory, fleet, customer, and financial reports."
        actionLabel="Export report"
      />
    ),
    icon: <GridIcon />,
    position: MenuPositions.Middle,
    auth: true,
    permissions: ['reports.read'],
    priority: 17,
    // Example variant hook — activate later via buildSidebarFromRoutes({ activeVariant: 'compact' }).
    variants: {
      compact: { name: 'Reports', hideInMenu: false },
    },
  },

  // --- redirects (hidden) ---
  {
    key: 'receiving-alias',
    name: 'Receiving',
    path: '/receiving',
    redirectTo: '/fuel-purchases',
    hideInMenu: true,
    auth: true,
  },
  {
    key: 'assets-alias',
    name: 'Assets',
    path: '/assets',
    redirectTo: '/settings/tanks',
    hideInMenu: true,
    auth: true,
  },
  {
    key: 'settings-index',
    name: 'Settings',
    path: '/settings',
    redirectTo: '/settings/pump',
    hideInMenu: true,
    auth: true,
  },

  // Person / apply: declare on a route when ready, e.g. `person: { enabled: true, param: 'personId' }`
  // or `apply: { enabled: true, target: 'fuel-onboarding' }`. Runtime ignores these until implemented.
];

/** Authenticated shell routes registered with React Router. */
export const fuelRouterRoutes: AppRouteModule[] = fuelRoutes;