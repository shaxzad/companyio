import { hasMenuPermission } from '../layout/types';
import type { AppRouteModule, MenuPosition, ResolvedAppRoute } from './types';

export const routePermissions = (route: AppRouteModule): string[] =>
  route.permissions ?? route.extraPermissions ?? [];

export const routeMatchesVariant = (
  route: AppRouteModule,
  activeVariant: string | undefined
): boolean => {
  if (!activeVariant) return true;
  if (!route.variant) return true;
  const variants = Array.isArray(route.variant) ? route.variant : [route.variant];
  return variants.includes(activeVariant);
};

/**
 * Merge a named variant override onto a route.
 * Does not implement person/apply — those fields are preserved as declared.
 */
export const resolveRouteVariant = (
  route: AppRouteModule,
  activeVariant?: string
): AppRouteModule => {
  if (!activeVariant || !route.variants?.[activeVariant]) return route;
  const override = route.variants[activeVariant];
  return {
    ...route,
    ...override,
    key: route.key,
    variants: route.variants,
  };
};

export const flattenRoutes = (routes: AppRouteModule[]): AppRouteModule[] =>
  routes.flatMap((route) => [route, ...(route.children ? flattenRoutes(route.children) : [])]);

export const toResolvedRoute = (route: AppRouteModule): ResolvedAppRoute => ({
  ...route,
  permissions: routePermissions(route),
});

export type FilterRoutesOptions = {
  permissions?: string[];
  activeVariant?: string;
  includeHidden?: boolean;
  /** When true, drop routes that declare person/apply placeholders as enabled. Default false (keep them). */
  excludePersonApplyPlaceholders?: boolean;
};

const isPersonEnabled = (route: AppRouteModule): boolean => {
  if (route.person === true) return true;
  if (route.person && typeof route.person === 'object') return route.person.enabled !== false;
  return false;
};

const isApplyEnabled = (route: AppRouteModule): boolean => {
  if (route.apply === true) return true;
  if (route.apply && typeof route.apply === 'object') return route.apply.enabled !== false;
  return false;
};

export const filterRoutes = (
  routes: AppRouteModule[],
  options: FilterRoutesOptions = {}
): ResolvedAppRoute[] => {
  const {
    permissions,
    activeVariant,
    includeHidden = false,
    excludePersonApplyPlaceholders = false,
  } = options;

  return flattenRoutes(routes)
    .map((route) => resolveRouteVariant(route, activeVariant))
    .filter((route) => routeMatchesVariant(route, activeVariant))
    .filter((route) => includeHidden || !route.hideInMenu)
    .filter((route) => {
      if (!excludePersonApplyPlaceholders) return true;
      // Future: when person/apply are implemented, this flag can hide unfinished routes.
      return !isPersonEnabled(route) && !isApplyEnabled(route);
    })
    .filter((route) => {
      // Only enforce permissions when the caller opts in with a granted list.
      if (permissions === undefined) return true;
      return hasMenuPermission(routePermissions(route), permissions);
    })
    .map(toResolvedRoute)
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));
};

export const DEFAULT_MAIN_POSITIONS: MenuPosition[] = ['upper', 'middle'];
export const DEFAULT_OTHERS_POSITIONS: MenuPosition[] = ['lower', 'bottom'];
