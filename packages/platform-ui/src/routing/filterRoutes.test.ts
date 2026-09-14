import { describe, expect, it } from 'vitest';
import { buildSidebarFromRoutes } from './buildSidebar';
import { filterRoutes, resolveRouteVariant } from './filterRoutes';
import { MenuPosition, type AppRouteModule } from './types';

const sampleRoutes: AppRouteModule[] = [
  {
    key: 'home',
    name: 'Overview',
    path: '/',
    position: MenuPosition.Middle,
    group: 'dashboard',
    groupName: 'Dashboard',
    priority: 1,
    permissions: ['*'],
  },
  {
    key: 'sales',
    name: 'Fuel sales',
    path: '/sales',
    position: MenuPosition.Middle,
    group: 'sales',
    groupName: 'Sales',
    priority: 2,
    permissions: ['sales.read'],
  },
  {
    key: 'hidden',
    name: 'Hidden',
    path: '/hidden',
    hideInMenu: true,
    position: MenuPosition.Middle,
  },
  {
    key: 'users',
    name: 'Users',
    path: '/users',
    position: MenuPosition.Lower,
    permissions: ['users.manage'],
  },
  {
    key: 'apply-stub',
    name: 'Apply stub',
    path: '/apply',
    apply: { enabled: true },
    hideInMenu: true,
    position: MenuPosition.Bottom,
  },
  {
    key: 'variant-only',
    name: 'Pro report',
    path: '/reports-pro',
    variant: 'pro',
    position: MenuPosition.Middle,
  },
];

describe('filterRoutes', () => {
  it('hides hideInMenu routes by default and filters by permission', () => {
    const result = filterRoutes(sampleRoutes, { permissions: ['sales.read'] });
    const keys = result.map((route) => route.key);
    expect(keys).toContain('home');
    expect(keys).toContain('sales');
    expect(keys).not.toContain('users');
    expect(keys).not.toContain('hidden');
  });

  it('can exclude person/apply placeholder routes when requested', () => {
    const result = filterRoutes(sampleRoutes, {
      includeHidden: true,
      permissions: ['*'],
      excludePersonApplyPlaceholders: true,
    });
    expect(result.map((route) => route.key)).not.toContain('apply-stub');
  });

  it('merges variant overrides', () => {
    const route: AppRouteModule = {
      key: 'reports',
      name: 'Reports',
      path: '/reports',
      variants: {
        compact: { name: 'Reports (compact)', hideInMenu: true },
      },
    };
    const resolved = resolveRouteVariant(route, 'compact');
    expect(resolved.name).toBe('Reports (compact)');
    expect(resolved.hideInMenu).toBe(true);
    expect(resolved.key).toBe('reports');
  });
});

describe('buildSidebarFromRoutes', () => {
  it('groups routes and splits main vs others by position', () => {
    const { navItems, othersItems } = buildSidebarFromRoutes(sampleRoutes, {
      permissions: ['*', 'sales.read', 'users.manage'],
    });

    expect(navItems.some((item) => item.key === 'dashboard')).toBe(true);
    expect(navItems.some((item) => item.key === 'sales')).toBe(true);
    expect(othersItems.some((item) => item.key === 'users')).toBe(true);
    expect(navItems.every((item) => item.key !== 'hidden')).toBe(true);
  });
});
