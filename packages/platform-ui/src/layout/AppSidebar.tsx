import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

import { Button } from '../components/ui/button';
import { ChevronDownIcon, ChevronLeftIcon, HorizontaLDots } from '../icons';
import { useSidebar } from '../context/SidebarContext';
import type { SidebarConfig, SidebarNavItem } from './types';

type AppSidebarProps = {
  config: SidebarConfig;
};

const AppSidebar: React.FC<AppSidebarProps> = ({ config }) => {
  const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  const navItems = config.navItems;
  const othersItems = useMemo(() => config.othersItems ?? [], [config.othersItems]);
  const mainLabel = config.mainLabel ?? 'Menu';
  const othersLabel = config.othersLabel ?? 'Others';

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: 'main' | 'others';
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const showExpandedContent = isExpanded || isMobileOpen;

  useEffect(() => {
    let submenuMatched = false;

    const menuGroups: {
      type: 'main' | 'others';
      items: SidebarNavItem[];
    }[] = [
      { type: 'main', items: navItems },
      { type: 'others', items: othersItems },
    ];

    for (const { type, items } of menuGroups) {
      items.forEach((nav, index) => {
        if (!nav.subItems) {
          return;
        }

        const hasActiveSubItem = nav.subItems.some((subItem) => isActive(subItem.path));

        if (hasActiveSubItem) {
          setOpenSubmenu({ type, index });
          submenuMatched = true;
        }
      });
    }

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [navItems, othersItems, isActive]);

  useEffect(() => {
    if (openSubmenu === null) {
      return;
    }

    const key = `${openSubmenu.type}-${openSubmenu.index}`;
    const element = subMenuRefs.current[key];

    if (!element) {
      return;
    }

    setSubMenuHeight((previousHeights) => ({
      ...previousHeights,
      [key]: element.scrollHeight,
    }));
  }, [openSubmenu, showExpandedContent]);

  const handleSubmenuToggle = (index: number, menuType: 'main' | 'others') => {
    setOpenSubmenu((previous) => {
      if (previous && previous.type === menuType && previous.index === index) {
        return null;
      }

      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: SidebarNavItem[], menuType: 'main' | 'others') => {
    return (
      <ul className="flex flex-col gap-1">
        {items.map((nav, index) => {
          const isSubmenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
          const itemKey = nav.key ?? `${menuType}-${nav.name}-${nav.path ?? index}`;

          return (
            <li key={itemKey}>
              {nav.subItems ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmenuToggle(index, menuType)}
                    className={cn(
                      'menu-item group cursor-pointer',
                      isSubmenuOpen ? 'menu-item-active' : 'menu-item-inactive',
                      !showExpandedContent && 'lg:justify-center'
                    )}
                  >
                    <span
                      className={cn(
                        'menu-item-icon-size shrink-0',
                        isSubmenuOpen ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                      )}
                    >
                      {nav.icon}
                    </span>

                    <span
                      className={cn(
                        'menu-item-text min-w-0 flex-1 truncate text-start transition-opacity duration-200',
                        showExpandedContent ? 'opacity-100' : 'lg:hidden'
                      )}
                    >
                      {nav.name}
                    </span>

                    <ChevronDownIcon
                      className={cn(
                        'ms-auto size-4 shrink-0 transition-transform duration-200',
                        showExpandedContent ? 'opacity-100' : 'lg:hidden',
                        isSubmenuOpen ? 'rotate-0 text-brand-500' : '-rotate-90'
                      )}
                    />
                  </button>

                  <div
                    ref={(element) => {
                      subMenuRefs.current[`${menuType}-${index}`] = element;
                    }}
                    className="overflow-hidden transition-[height] duration-300 ease-in-out"
                    style={{
                      height:
                        showExpandedContent && isSubmenuOpen
                          ? `${subMenuHeight[`${menuType}-${index}`] ?? 0}px`
                          : '0px',
                    }}
                  >
                    <ul className="ms-4 mt-1 space-y-0.5 border-s border-gray-100 ps-3 dark:border-gray-800">
                      {nav.subItems.map((subItem) => {
                        const active = isActive(subItem.path);
                        const subKey = subItem.key ?? `${subItem.path}-${subItem.name}`;

                        return (
                          <li key={subKey}>
                            <Link
                              to={subItem.path}
                              className={cn(
                                'menu-dropdown-item',
                                active ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
                              )}
                            >
                              {subItem.name}

                              <span className="ms-auto flex items-center gap-1">
                                {subItem.new && (
                                  <span
                                    className={cn(
                                      'menu-dropdown-badge',
                                      active
                                        ? 'menu-dropdown-badge-active'
                                        : 'menu-dropdown-badge-inactive'
                                    )}
                                  >
                                    new
                                  </span>
                                )}

                                {subItem.pro && (
                                  <span
                                    className={cn(
                                      'menu-dropdown-badge',
                                      active
                                        ? 'menu-dropdown-badge-active'
                                        : 'menu-dropdown-badge-inactive'
                                    )}
                                  >
                                    pro
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              ) : (
                nav.path && (
                  <Link
                    to={nav.path}
                    className={cn(
                      'menu-item group',
                      isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive',
                      !showExpandedContent && 'lg:justify-center'
                    )}
                  >
                    <span
                      className={cn(
                        'menu-item-icon-size shrink-0',
                        isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                      )}
                    >
                      {nav.icon}
                    </span>

                    <span
                      className={cn(
                        'menu-item-text min-w-0 truncate transition-opacity duration-200',
                        showExpandedContent ? 'opacity-100' : 'lg:hidden'
                      )}
                    >
                      {nav.name}
                    </span>
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <aside
      className={cn(
        'fixed start-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-e border-gray-200 bg-white px-3 text-gray-900 transition-[width,transform] duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 lg:translate-x-0',
        showExpandedContent ? 'w-[260px]' : 'w-[72px]',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 py-3',
          showExpandedContent ? 'h-16 justify-between px-1' : 'flex-col justify-center'
        )}
      >
        <Link
          to={config.projectDetails?.href ?? '/'}
          className={cn(
            'flex min-w-0 items-center gap-2 overflow-hidden',
            !showExpandedContent && 'lg:hidden'
          )}
        >
          {config.projectDetails?.logo || config.projectDetails?.darkLogo ? (
            <>
              {config.projectDetails?.logo && (
                <img
                  className={config.projectDetails.darkLogo ? 'dark:hidden' : ''}
                  src={config.projectDetails.logo}
                  alt={config.projectDetails.name ?? 'Logo'}
                  width={config.projectDetails.logoWidth ?? 150}
                  height={config.projectDetails.logoHeight ?? 40}
                />
              )}

              {config.projectDetails?.darkLogo && (
                <img
                  className="hidden dark:block"
                  src={config.projectDetails.darkLogo}
                  alt={config.projectDetails.name ?? 'Logo'}
                  width={config.projectDetails.logoWidth ?? 150}
                  height={config.projectDetails.logoHeight ?? 40}
                />
              )}
            </>
          ) : (
            <span className="truncate text-base font-semibold tracking-tight">
              {config.projectDetails?.name ?? 'Company'}
            </span>
          )}
        </Link>

        {!showExpandedContent && (
          <Link to={config.projectDetails?.href ?? '/'} className="hidden lg:flex" aria-label="Home">
            {config.projectDetails?.collapsedLogo ? (
              <img
                src={config.projectDetails.collapsedLogo}
                alt={config.projectDetails.name ?? 'Logo'}
                width={28}
                height={28}
              />
            ) : (
              <span className="text-sm font-semibold">
                {config.projectDetails?.name?.charAt(0).toUpperCase() ?? 'C'}
              </span>
            )}
          </Link>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden size-8 shrink-0 rounded-md text-gray-500 shadow-none hover:bg-gray-100 lg:inline-flex dark:hover:bg-white/5 [&_svg]:size-4"
          onClick={toggleSidebar}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronLeftIcon
            className={cn('transition-transform duration-300 ease-in-out', !isExpanded && 'rotate-180')}
          />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 duration-300 ease-linear no-scrollbar">
        <nav className="mt-2">
          <div className="flex flex-col gap-6">
            <div>
              <h2
                className={cn(
                  'mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400',
                  !showExpandedContent && 'lg:flex lg:justify-center lg:px-0'
                )}
              >
                {showExpandedContent ? mainLabel : <HorizontaLDots className="size-5" />}
              </h2>

              {renderMenuItems(navItems, 'main')}
            </div>

            {othersItems.length > 0 && (
              <div>
                <h2
                  className={cn(
                    'mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400',
                    !showExpandedContent && 'lg:flex lg:justify-center lg:px-0'
                  )}
                >
                  {showExpandedContent ? othersLabel : <HorizontaLDots className="size-5" />}
                </h2>

                {renderMenuItems(othersItems, 'others')}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
