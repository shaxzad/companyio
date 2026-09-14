import type { SidebarNavItem, SidebarSubItem } from '../layout/types';
import { DEFAULT_MAIN_POSITIONS, DEFAULT_OTHERS_POSITIONS, filterRoutes } from './filterRoutes';
import type { AppRouteModule, BuildSidebarFromRoutesOptions, MenuPosition } from './types';

type GroupBucket = {
  key: string;
  name: string;
  icon?: SidebarNavItem['icon'];
  priority: number;
  position: MenuPosition;
  permissions?: string[];
  subItems: SidebarSubItem[];
};

const normalizePosition = (position: MenuPosition | undefined): MenuPosition =>
  position ?? 'middle';

const inPositions = (position: MenuPosition, allowed: MenuPosition[]) => allowed.includes(position);

/**
 * Turn an `AppRouteModule[]` into sidebar `navItems` / `othersItems`.
 * Grouped routes (shared `group`) become one parent with `subItems`.
 */
export const buildSidebarFromRoutes = (
  routes: AppRouteModule[],
  options: BuildSidebarFromRoutesOptions = {}
): { navItems: SidebarNavItem[]; othersItems: SidebarNavItem[] } => {
  const mainPositions = options.mainPositions ?? DEFAULT_MAIN_POSITIONS;
  const othersPositions = options.othersPositions ?? DEFAULT_OTHERS_POSITIONS;

  const visible = filterRoutes(routes, {
    permissions: options.permissions,
    activeVariant: options.activeVariant,
    includeHidden: options.includeHidden ?? false,
  });

  const navItems: SidebarNavItem[] = [];
  const othersItems: SidebarNavItem[] = [];
  const groups = new Map<string, GroupBucket>();

  for (const route of visible) {
    if (route.redirectTo) continue;

    const position = normalizePosition(route.position);
    const target = inPositions(position, mainPositions)
      ? navItems
      : inPositions(position, othersPositions)
        ? othersItems
        : navItems;

    if (route.group) {
      const existing = groups.get(route.group);
      const subItem: SidebarSubItem = {
        key: route.key,
        name: route.name,
        path: route.path,
        permissions: route.permissions,
        hideInMenu: route.hideInMenu,
        priority: route.priority,
      };

      if (existing) {
        existing.subItems.push(subItem);
        existing.priority = Math.min(existing.priority, route.priority ?? existing.priority);
        continue;
      }

      groups.set(route.group, {
        key: route.group,
        name: route.groupName ?? route.name,
        icon: route.groupIcon ?? route.icon,
        priority: route.priority ?? 0,
        position,
        permissions: route.permissions,
        subItems: [subItem],
      });
      continue;
    }

    target.push({
      key: route.key,
      name: route.name,
      path: route.path,
      icon: route.icon ?? null,
      permissions: route.permissions,
      priority: route.priority,
      position: position === 'lower' || position === 'bottom' ? 'others' : 'main',
      hideInMenu: route.hideInMenu,
    });
  }

  for (const group of groups.values()) {
    const target = inPositions(group.position, mainPositions)
      ? navItems
      : inPositions(group.position, othersPositions)
        ? othersItems
        : navItems;

    target.push({
      key: group.key,
      name: group.name,
      icon: group.icon ?? null,
      permissions: group.permissions,
      priority: group.priority,
      position: group.position === 'lower' || group.position === 'bottom' ? 'others' : 'main',
      subItems: group.subItems.sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0)),
    });
  }

  const byPriority = (left: SidebarNavItem, right: SidebarNavItem) =>
    (left.priority ?? 0) - (right.priority ?? 0);

  return {
    navItems: navItems.sort(byPriority),
    othersItems: othersItems.sort(byPriority),
  };
};
