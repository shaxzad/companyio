import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';

import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import type { HeaderMenuItem, HeaderMenuLink, HeaderUser } from '../../layout/types';
import { ThemeModeSwitcher } from './ThemeModeSwitcher';

const DEFAULT_MENU_ITEMS: HeaderMenuItem[] = [
  { key: 'profile', label: 'Profile', path: '/profile' },
];

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.37 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.37H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .37-1.08V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.3.4.65.44 1.03.03.1.05.2.05.31H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.08.37c-.3.24-.52.58-.6 1Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M5.5 19.25c.9-3 3.2-4.75 6.5-4.75s5.6 1.75 6.5 4.75"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M4 12h10M7 9l-3 3 3 3"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const defaultIconForLabel = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('setting')) return <SettingsIcon />;
  if (normalized.includes('profile') || normalized.includes('employee')) return <ProfileIcon />;
  if (normalized.includes('log')) return <LogoutIcon />;
  return <ProfileIcon />;
};

const linksToItems = (links: HeaderMenuLink[]): HeaderMenuItem[] =>
  links.map((link, index) => ({
    key: `${link.path}-${link.label}-${index}`,
    label: link.label,
    path: link.path,
    icon: link.icon,
  }));

export type UserDropdownProps = {
  user?: HeaderUser;
  menuLinks?: HeaderMenuLink[];
  menuItems?: HeaderMenuItem[];
  showThemeSwitcher?: boolean;
  avatarOnly?: boolean;
  showSignOut?: boolean;
  signOutLabel?: string;
};

export default function UserDropdown({
  user: userProp,
  menuLinks,
  menuItems,
  showThemeSwitcher = true,
  avatarOnly = true,
  showSignOut = true,
  signOutLabel = 'Log Out',
}: UserDropdownProps) {
  const { user: authUser, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user: HeaderUser = userProp ?? {
    name: authUser?.name?.trim() || authUser?.email || 'User',
    email: authUser?.email,
    avatarUrl: authUser?.avatarUrl,
  };

  const items = useMemo(() => {
    if (menuItems?.length) return menuItems;
    if (menuLinks?.length) return linksToItems(menuLinks);
    return DEFAULT_MENU_ITEMS;
  }, [menuItems, menuLinks]);

  const displayName = user.name.trim() || user.email || 'User';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      return;
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-auto rounded-full p-0 text-gray-700 shadow-none hover:bg-transparent dark:text-gray-300',
            !avatarOnly && 'gap-3 px-2 py-1'
          )}
          aria-label="Open user menu"
        >
          <Avatar src={user.avatarUrl} alt={displayName} size="medium" className="size-10" />
          {!avatarOnly ? (
            <span className="block max-w-[10rem] truncate font-medium text-theme-sm">
              {displayName}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[280px] rounded-2xl border-gray-200 p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar src={user.avatarUrl} alt={displayName} size="large" className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {displayName}
            </p>
            {user.email ? (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            ) : null}
          </div>
        </div>

        {showThemeSwitcher ? (
          <>
            <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-800" />
            <ThemeModeSwitcher />
          </>
        ) : null}

        {items.length > 0 ? (
          <>
            <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-800" />
            {items.map((item) => {
              const content = (
                <>
                  <span className="text-gray-500 dark:text-gray-400">
                    {item.icon ?? defaultIconForLabel(item.label)}
                  </span>
                  <span>{item.label}</span>
                </>
              );
              const className = cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200',
                item.destructive && 'text-error-600 dark:text-error-400'
              );

              if (item.path) {
                return (
                  <DropdownMenuItem key={item.key ?? `${item.path}-${item.label}`} asChild>
                    <Link to={item.path} className={className} onClick={item.onSelect}>
                      {content}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={item.key ?? item.label}
                  className={className}
                  onSelect={() => item.onSelect?.()}
                >
                  {content}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}

        {showSignOut ? (
          <>
            <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-800" />
            <DropdownMenuItem
              disabled={isSigningOut}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200"
              onSelect={() => {
                void handleSignOut();
              }}
            >
              <span className="text-gray-500 dark:text-gray-400">
                <LogoutIcon />
              </span>
              <span>{isSigningOut ? 'Signing out...' : signOutLabel}</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
