import { isFuelRole, type FuelRole } from '@companyio/auth-contracts';

export const ROLE_LABELS: Record<FuelRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff / Cashier',
  accountant: 'Accountant',
};

export const ROLE_OPTIONS = (['manager', 'staff', 'accountant'] as const).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

type ScreenAccess = {
  view: FuelRole[];
  edit: FuelRole[];
  approve: FuelRole[];
};

const ALL: FuelRole[] = ['owner', 'manager', 'staff', 'accountant'];
const OPERATIONS: FuelRole[] = ['owner', 'manager', 'staff'];
const CREDIT: FuelRole[] = ['owner', 'manager', 'accountant'];
const MANAGEMENT: FuelRole[] = ['owner', 'manager'];
const REPORTS: FuelRole[] = ['owner', 'manager', 'accountant'];
const OWNER: FuelRole[] = ['owner'];
const APPROVERS: FuelRole[] = ['owner', 'manager'];

const SCREEN_ACCESS: Record<string, ScreenAccess> = {
  '/': { view: ALL, edit: [], approve: [] },
  '/profile': { view: ALL, edit: ALL, approve: [] },
  '/users': { view: OWNER, edit: OWNER, approve: [] },
  '/sales': { view: OPERATIONS, edit: OPERATIONS, approve: APPROVERS },
  '/fleet-sales': { view: OPERATIONS, edit: OPERATIONS, approve: APPROVERS },
  '/fuel-purchases': { view: OPERATIONS, edit: OPERATIONS, approve: APPROVERS },
  '/expenses': { view: OPERATIONS, edit: OPERATIONS, approve: APPROVERS },
  '/organizations': { view: CREDIT, edit: CREDIT, approve: APPROVERS },
  '/customers': { view: CREDIT, edit: CREDIT, approve: APPROVERS },
  '/vehicles': { view: CREDIT, edit: CREDIT, approve: APPROVERS },
  '/credit-accounts': { view: CREDIT, edit: CREDIT, approve: APPROVERS },
  '/payments': { view: CREDIT, edit: CREDIT, approve: APPROVERS },
  '/inventory': { view: MANAGEMENT, edit: MANAGEMENT, approve: APPROVERS },
  '/assets': { view: MANAGEMENT, edit: MANAGEMENT, approve: APPROVERS },
  '/reports': { view: REPORTS, edit: [], approve: [] },
  '/settings': { view: MANAGEMENT, edit: OWNER, approve: [] },
  '/opening': { view: OPERATIONS, edit: OPERATIONS, approve: OWNER },
};

const FALLBACK: ScreenAccess = { view: OWNER, edit: OWNER, approve: OWNER };

export const screenPath = (path: string) => {
  if (path === '/receiving') return '/fuel-purchases';
  if (path.startsWith('/settings')) return '/settings';
  if (path === '/assets') return '/settings';
  if (path === '/' || path === '') return '/';
  const [segment] = path.replace(/^\//, '').split('/');
  return `/${segment}`;
};

const accessFor = (path: string) => SCREEN_ACCESS[screenPath(path)] ?? FALLBACK;

export const canAccessPath = (role: FuelRole, path: string) => accessFor(path).view.includes(role);
export const canEditPath = (role: FuelRole, path: string) => accessFor(path).edit.includes(role);
export const canApprovePath = (role: FuelRole, path: string) =>
  accessFor(path).approve.includes(role);

export const roleOf = (user: { role?: FuelRole } | null | undefined): FuelRole | null =>
  user && isFuelRole(user.role) ? user.role : null;
