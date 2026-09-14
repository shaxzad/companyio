export type {
  ApplyRouteOptions,
  AppRouteAuth,
  AppRouteLazyComponent,
  AppRouteModule,
  BuildSidebarFromRoutesOptions,
  MenuPosition,
  PersonRouteOptions,
  ResolvedAppRoute,
} from './types';
export { MenuPosition as MenuPositions } from './types';

export {
  DEFAULT_MAIN_POSITIONS,
  DEFAULT_OTHERS_POSITIONS,
  filterRoutes,
  flattenRoutes,
  resolveRouteVariant,
  routeMatchesVariant,
  routePermissions,
  toResolvedRoute,
} from './filterRoutes';
export type { FilterRoutesOptions } from './filterRoutes';

export { buildSidebarFromRoutes } from './buildSidebar';
export { buildRouterRoutes, listRoutableModules } from './buildRoutes';
export type { BuildRouterRoutesOptions } from './buildRoutes';
