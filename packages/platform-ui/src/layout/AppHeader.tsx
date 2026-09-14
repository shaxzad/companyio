import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

import { useSidebar } from '../context/SidebarContext';
import { ThemeToggleButton } from '../components/common/ThemeToggleButton';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';
import type { HeaderConfig, HeaderStatusBadge, SidebarProjectDetails } from './types';

export type AppHeaderProps = {
  config?: HeaderConfig;
  projectDetails?: SidebarProjectDetails;
};

const statusVariantClass: Record<NonNullable<HeaderStatusBadge['variant']>, string> = {
  default:
    'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800',
  success:
    'border-success-500 text-success-600 hover:bg-success-50 dark:border-success-500 dark:text-success-400 dark:hover:bg-success-500/10',
  warning:
    'border-warning-500 text-warning-600 hover:bg-warning-50 dark:border-warning-500 dark:text-warning-400 dark:hover:bg-warning-500/10',
  danger:
    'border-error-500 text-error-600 hover:bg-error-50 dark:border-error-500 dark:text-error-400 dark:hover:bg-error-500/10',
};

const AppHeader: React.FC<AppHeaderProps> = ({ config, projectDetails }) => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);

  const themeInUserMenu = config?.showThemeInUserMenu !== false;
  const showThemeToggle =
    config?.showThemeToggle !== undefined ? config.showThemeToggle : !themeInUserMenu;
  const showNotifications = config?.showNotifications !== false;
  const searchEnabled =
    config?.search !== false && (config?.search === undefined || config.search.enabled !== false);
  const searchPlaceholder =
    (config?.search !== false && config?.search?.placeholder) || 'Search or type command...';
  const logoHref = config?.logo?.href ?? projectDetails?.href ?? '/';
  const lightLogo = config?.logo?.light || projectDetails?.logo;
  const darkLogo = config?.logo?.dark || projectDetails?.darkLogo || lightLogo;
  const logoAlt = config?.logo?.alt || projectDetails?.name || 'Logo';
  const status = config?.status === false ? undefined : config?.status;

  useEffect(() => {
    if (!searchEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchEnabled]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (config?.search !== false) {
      config?.search?.onSubmit?.(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="z-99999 flex size-10 rounded-lg border-gray-200 text-gray-500 shadow-none lg:hidden dark:border-gray-800 dark:text-gray-400 [&_svg]:size-auto"
            onClick={toggleMobileSidebar}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </Button>

          <Link to={logoHref} className="lg:hidden">
            {lightLogo || darkLogo ? (
              <>
                {lightLogo ? (
                  <img
                    className={darkLogo && darkLogo !== lightLogo ? 'dark:hidden' : ''}
                    src={lightLogo}
                    alt={logoAlt}
                  />
                ) : null}
                {darkLogo && darkLogo !== lightLogo ? (
                  <img className="hidden dark:block" src={darkLogo} alt={logoAlt} />
                ) : null}
              </>
            ) : (
              <span className="text-base font-semibold tracking-tight">{logoAlt}</span>
            )}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setApplicationMenuOpen((open) => !open)}
            aria-label="Toggle application menu"
            className="z-99999 size-10 rounded-lg text-gray-700 shadow-none hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800 [&_svg]:size-auto"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </Button>

          {searchEnabled ? (
            <div className="hidden lg:block">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2">
                    <svg
                      className="fill-gray-500 dark:fill-gray-400"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                        fill=""
                      />
                    </svg>
                  </span>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border-gray-200 bg-transparent py-2.5 ps-12 pe-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus-visible:border-brand-300 focus-visible:ring-3 focus-visible:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus-visible:border-brand-800 xl:w-[430px]"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="absolute end-2.5 top-1/2 h-auto min-h-0 -translate-y-1/2 gap-0.5 rounded-lg border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 shadow-none hover:bg-gray-50 hover:text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-400"
                  >
                    <span> ⌘ </span>
                    <span> K </span>
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            'w-full items-center justify-end gap-2 px-5 py-4 shadow-theme-md sm:gap-3 lg:flex lg:px-0 lg:shadow-none',
            isApplicationMenuOpen ? 'flex' : 'hidden'
          )}
        >
          {config?.actions}

          {status ? (
            <Button
              type="button"
              variant="outline"
              onClick={status.onClick}
              className={cn(
                'h-9 rounded-lg border bg-transparent px-3 text-sm font-medium shadow-none',
                statusVariantClass[status.variant ?? 'danger']
              )}
            >
              {status.label}
            </Button>
          ) : null}

          {config?.iconActions?.map((action) => {
            const content = (
              <>
                {action.badge != null && String(action.badge) !== '' ? (
                  <span className="absolute -end-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {action.badge}
                  </span>
                ) : null}
                {action.icon}
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={action.key}
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                  className="relative size-10 rounded-full border-gray-200 bg-white text-gray-500 shadow-none hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <Link to={action.href} aria-label={action.label}>
                    {content}
                  </Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.key}
                type="button"
                variant="outline"
                size="icon"
                aria-label={action.label}
                onClick={action.onClick}
                className="relative size-10 rounded-full border-gray-200 bg-white text-gray-500 shadow-none hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {content}
              </Button>
            );
          })}

          {showThemeToggle ? <ThemeToggleButton /> : null}

          {showNotifications ? (
            <NotificationDropdown
              notifications={config?.notifications}
              viewAllHref={config?.notificationsHref}
              count={config?.notificationCount}
            />
          ) : null}

          <UserDropdown
            user={config?.user}
            menuLinks={config?.userMenuLinks}
            menuItems={config?.userMenuItems}
            showThemeSwitcher={themeInUserMenu}
            avatarOnly={config?.avatarOnly !== false}
            showSignOut={config?.showSignOut !== false}
            signOutLabel={config?.signOutLabel}
          />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
