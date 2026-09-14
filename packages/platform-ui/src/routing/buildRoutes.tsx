import { createElement, type ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';

import { filterRoutes } from './filterRoutes';
import type { AppRouteModule } from './types';

export type BuildRouterRoutesOptions = {
  permissions?: string[];
  activeVariant?: string;
  /** Include hideInMenu routes in the router (almost always true). Defaults to true. */
  includeHidden?: boolean;
};

const routeElement = (route: AppRouteModule): ReactNode => {
  if (route.redirectTo) {
    return createElement(Navigate, { to: route.redirectTo, replace: true });
  }
  if (route.element != null) return route.element;
  return null;
};

/**
 * Build React Router v6/v7 `<Route>` elements from app route modules.
 * Nested `children` become nested `<Route>`s.
 */
export const buildRouterRoutes = (
  routes: AppRouteModule[],
  options: BuildRouterRoutesOptions = {}
): ReactNode[] => {
  const includeHidden = options.includeHidden ?? true;
  const allowedKeys = new Set(
    filterRoutes(routes, {
      permissions: options.permissions,
      activeVariant: options.activeVariant,
      includeHidden,
      // Person/apply are placeholders — still register routes if present so apps can stub pages.
      excludePersonApplyPlaceholders: false,
    }).map((route) => route.key)
  );

  const renderTree = (items: AppRouteModule[]): ReactNode[] =>
    items
      .filter((route) => allowedKeys.has(route.key) || route.children?.length)
      .map((route) => {
        const element = routeElement(route);
        const childRoutes = route.children?.length ? renderTree(route.children) : null;

        if (route.index) {
          return createElement(Route, {
            key: route.key,
            index: true,
            element: element ?? undefined,
          });
        }

        return createElement(
          Route,
          {
            key: route.key,
            path: route.path.startsWith('/') ? route.path.replace(/^\//, '') : route.path,
            element: element ?? undefined,
          },
          ...(childRoutes ?? [])
        );
      });

  // Absolute paths: prefer full path on each Route for flat app trees (fuel-web style).
  return routes
    .filter((route) => allowedKeys.has(route.key) || (route.children?.length ?? 0) > 0)
    .flatMap((route) => {
      if (route.children?.length) {
        return [
          createElement(
            Route,
            {
              key: route.key,
              path: route.path,
              element: routeElement(route) ?? undefined,
            },
            ...renderTree(route.children)
          ),
        ];
      }

      if (route.index) {
        return [
          createElement(Route, {
            key: route.key,
            index: true,
            element: routeElement(route) ?? undefined,
          }),
        ];
      }

      return [
        createElement(Route, {
          key: route.key,
          path: route.path,
          element: routeElement(route) ?? undefined,
        }),
      ];
    });
};

/**
 * Flat list helper when the app prefers mapping itself:
 * `routes.map((r) => <Route key={r.key} path={r.path} element={r.element} />)`.
 */
export const listRoutableModules = (
  routes: AppRouteModule[],
  options: BuildRouterRoutesOptions = {}
): AppRouteModule[] =>
  filterRoutes(routes, {
    permissions: options.permissions,
    activeVariant: options.activeVariant,
    includeHidden: options.includeHidden ?? true,
  }).filter((route) => route.element != null || route.redirectTo || route.component);
