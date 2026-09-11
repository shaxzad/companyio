import type { ComponentType, ReactNode } from 'react';

/**
 * Menu rail position — mirrors the shared `IMenuPosition` pattern.
 * Apps can map these into sidebar sections via `buildSidebarFromRoutes`.
 */
export const MenuPosition = {
  Upper: 'upper',
  Middle: 'middle',
  Lower: 'lower',
  Bottom: 'bottom',
} as const;

export type MenuPosition = (typeof MenuPosition)[keyof typeof MenuPosition];

/** Auth requirement for a route module. */
export type AppRouteAuth = boolean | 'optional';

/**
 * Reserved for future multi-person / person-context routing.
 * Declaring this does nothing at runtime yet — safe to set for forward compatibility.
 */
export type PersonRouteOptions = {
  enabled?: boolean;
  /** Future: path param name, e.g. `personId`. */
  param?: string;
};

/**
 * Reserved for future apply / application workflow routing.
 * Declaring this does nothing at runtime yet — safe to set for forward compatibility.
 */
export type ApplyRouteOptions = {
  enabled?: boolean;
  /** Future: apply target or workflow id. */
  target?: string;
};

export type AppRouteLazyComponent = () => Promise<{ default: ComponentType<unknown> }>;

/**
 * Application route module — reusable across apps.
 * Shape follows the shared `IRouteModule` style (key, path, auth, permissions, position, …)
 * without locking apps into a code-generated Remix pipeline.
 */
export type AppRouteModule = {
  key: string;
  name: string;
  path: string;
  /** Sync element for React Router. Prefer this in Vite apps. */
  element?: ReactNode;
  /** Optional lazy import; used when `element` is omitted. */
  component?: AppRouteLazyComponent;
  /** Redirect instead of rendering (e.g. legacy path aliases). */
  redirectTo?: string;
  icon?: ReactNode;
  position?: MenuPosition;
  hideInMenu?: boolean;
  /**
   * Auth gate metadata for the consuming app.
   * - `true` (default when omitted in app helpers): requires session
   * - `false`: public
   * - `'optional'`: session optional
   */
  auth?: AppRouteAuth;
  /** Required permission tokens (any-of). `'*'` = any authenticated user. */
  permissions?: string[];
  /** Alias of `permissions` for parity with older `extraPermissions` configs. */
  extraPermissions?: string[];
  priority?: number;
  exact?: boolean;
  index?: boolean;
  /**
   * Group key for submenu parents in the sidebar.
   * Routes that share a `group` become one nav item with `subItems`.
   */
  group?: string;
  /** Display name for the group parent. Taken from the first route in the group. */
  groupName?: string;
  groupIcon?: ReactNode;
  /**
   * Active feature variant id(s). Combined with `variants` when resolving a route.
   * Apps may filter which routes are active for a given product variant.
   */
  variant?: string | string[];
  /** Named overrides merged when the app activates a variant. */
  variants?: Record<string, Partial<Omit<AppRouteModule, 'key' | 'variants'>>>;
  /**
   * Placeholder — person/context routing (not implemented).
   * Keep optional so apps can declare intent without runtime behavior.
   */
  person?: boolean | PersonRouteOptions;
  /**
   * Placeholder — apply/application flows (not implemented).
   * Keep optional so apps can declare intent without runtime behavior.
   */
  apply?: boolean | ApplyRouteOptions;
  children?: AppRouteModule[];
  /** Opaque handle bag for app-specific metadata. */
  handle?: Record<string, unknown>;
};

export type BuildSidebarFromRoutesOptions = {
  /** Current user permission tokens. */
  permissions?: string[];
  /** When set, only routes matching this variant (or with no variant) are included. */
  activeVariant?: string;
  /** Positions that land in the primary (`navItems`) section. Defaults: upper + middle. */
  mainPositions?: MenuPosition[];
  /** Positions that land in the secondary (`othersItems`) section. Defaults: lower + bottom. */
  othersPositions?: MenuPosition[];
  /** Include routes with `hideInMenu: true`. Defaults to false. */
  includeHidden?: boolean;
};

export type ResolvedAppRoute = AppRouteModule & {
  permissions: string[];
};
