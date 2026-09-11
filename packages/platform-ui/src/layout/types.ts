import type { ReactNode } from 'react';

/**
 * Sidebar section after route positions are mapped.
 * Route modules use `MenuPosition` (`upper` | `middle` | `lower` | `bottom`);
 * `buildSidebarFromRoutes` maps those into `main` / `others`.
 */
export type LayoutMenuPosition = 'main' | 'others';

export type SidebarSubItem = {
  /** Stable id (route key). Optional for backward compatibility. */
  key?: string;
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  /** Hidden from the menu but the route may still exist in the app. */
  hideInMenu?: boolean;
  /**
   * Required permissions to show this item.
   * When `SidebarConfig.permissions` is set, the user must hold at least one.
   * Use `'*'` to allow any authenticated user.
   */
  permissions?: string[];
  priority?: number;
};

export type SidebarNavItem = {
  key?: string;
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: SidebarSubItem[];
  hideInMenu?: boolean;
  permissions?: string[];
  /** Prefer putting items in `navItems` / `othersItems`; this is for sorting within a group. */
  priority?: number;
  position?: LayoutMenuPosition;
};

export type SidebarProjectDetails = {
  name?: string;
  logo?: string;
  darkLogo?: string;
  collapsedLogo?: string;
  logoWidth?: number;
  logoHeight?: number;
  /** Defaults to "/". */
  href?: string;
};

export type HeaderUser = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type HeaderMenuLink = {
  label: string;
  path: string;
  icon?: ReactNode;
};

/** Richer user-menu entry — path and/or onSelect. */
export type HeaderMenuItem = {
  key?: string;
  label: string;
  path?: string;
  icon?: ReactNode;
  onSelect?: () => void;
  /** Renders with destructive styling (e.g. custom logout). */
  destructive?: boolean;
};

export type HeaderStatusBadge = {
  label: string;
  /** Visual tone. Defaults to `danger` (matches “Checked Out” style). */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
};

export type HeaderIconAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: string | number;
};

export type HeaderNotification = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  avatarUrl?: string;
  href?: string;
  unread?: boolean;
};

export type HeaderSearchConfig = {
  /** Defaults to true when `header.search` is omitted as an object. Pass `false` to hide. */
  enabled?: boolean;
  placeholder?: string;
  onSubmit?: (query: string) => void;
};

export type HeaderConfig = {
  /** Signed-in user shown in the avatar menu. When omitted, auth-react session is used if present. */
  user?: HeaderUser;
  /**
   * Links under the user menu (legacy). Prefer `userMenuItems` when you need icons / actions.
   * Defaults to Edit profile → /profile when both are omitted.
   */
  userMenuLinks?: HeaderMenuLink[];
  /** Icon + label menu rows (Settings, Profile, Switch view, …). */
  userMenuItems?: HeaderMenuItem[];
  /** Notification list. Empty / omitted shows an empty state (no hard-coded demo rows). */
  notifications?: HeaderNotification[];
  /** Explicit badge count. Falls back to unread / list length when omitted. */
  notificationCount?: number;
  /** “View all” link. Defaults to "/". */
  notificationsHref?: string;
  /** Defaults to true. */
  showNotifications?: boolean;
  /**
   * Standalone theme button in the header bar.
   * Defaults to `false` when theme lives inside the user menu; otherwise `true` for older apps.
   */
  showThemeToggle?: boolean;
  /** Theme segmented control inside the user dropdown. Defaults to true. */
  showThemeInUserMenu?: boolean;
  /** Avatar-only trigger (no name/chevron). Defaults to true. */
  avatarOnly?: boolean;
  /** Show built-in sign-out row. Defaults to true. */
  showSignOut?: boolean;
  signOutLabel?: string;
  /** Optional status chip (e.g. “Checked Out”). */
  status?: HeaderStatusBadge | false;
  /** Circular icon buttons between status and notifications. */
  iconActions?: HeaderIconAction[];
  /**
   * Search field in the header.
   * - omit / `{ enabled: true }` → show default search
   * - `false` → hide
   */
  search?: HeaderSearchConfig | false;
  /** Mobile header logo override (falls back to `projectDetails`). */
  logo?: {
    light?: string;
    dark?: string;
    href?: string;
    alt?: string;
  };
  /** Extra controls rendered before status / icon actions. */
  actions?: ReactNode;
};

/**
 * Shell configuration passed from each application into `AppLayout`.
 * All new fields are optional so existing apps keep working.
 */
export type SidebarConfig = {
  projectDetails?: SidebarProjectDetails;
  navItems: SidebarNavItem[];
  /** Defaults to []. */
  othersItems?: SidebarNavItem[];
  /** Current user permission tokens used to filter menu items that declare `permissions`. */
  permissions?: string[];
  /** Section label above primary nav. Defaults to "Menu". */
  mainLabel?: string;
  /** Section label above secondary nav. Defaults to "Others". */
  othersLabel?: string;
  /** Header controls — user, search, notifications, theme, custom actions. */
  header?: HeaderConfig;
  /** Optional class on the main content wrapper around `<Outlet />`. */
  contentClassName?: string;
};

/** Alias preferred by newer apps; identical to `SidebarConfig`. */
export type LayoutConfig = SidebarConfig;

export const hasMenuPermission = (
  required: string[] | undefined,
  granted: string[] | undefined
): boolean => {
  if (!required || required.length === 0) return true;
  if (required.includes('*')) return true;
  // No granted list provided → app is not using permission gating; allow.
  if (granted === undefined) return true;
  if (granted.length === 0) return false;
  if (granted.includes('*')) return true;
  return required.some((permission) => granted.includes(permission));
};

export const filterSidebarItems = (
  items: SidebarNavItem[],
  permissions?: string[]
): SidebarNavItem[] =>
  items
    .filter((item) => !item.hideInMenu && hasMenuPermission(item.permissions, permissions))
    .map((item) => {
      if (!item.subItems?.length) return item;
      const subItems = item.subItems.filter(
        (sub) => !sub.hideInMenu && hasMenuPermission(sub.permissions, permissions)
      );
      return { ...item, subItems };
    })
    .filter((item) => Boolean(item.path) || (item.subItems?.length ?? 0) > 0)
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));
