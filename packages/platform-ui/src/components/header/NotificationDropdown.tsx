import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { HeaderNotification } from '../../layout/types';

export type NotificationDropdownProps = {
  notifications?: HeaderNotification[];
  viewAllHref?: string;
  /** Explicit count badge. Falls back to unread count, then list length. */
  count?: number;
};

export default function NotificationDropdown({
  notifications = [],
  viewAllHref = '/',
  count,
}: NotificationDropdownProps) {
  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread === true).length,
    [notifications]
  );
  const badgeCount = count ?? (unreadCount > 0 ? unreadCount : notifications.length);
  const [notifying, setNotifying] = useState(badgeCount > 0);

  useEffect(() => {
    setNotifying(badgeCount > 0);
  }, [badgeCount]);

  const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setNotifying(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative size-10 rounded-full border-gray-200 bg-white text-gray-500 shadow-none hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white [&_svg]:size-auto"
          aria-label="Notifications"
        >
          {notifying && badgeCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold leading-none text-white">
              {badgeLabel}
            </span>
          ) : null}
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
              fill="currentColor"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex h-[480px] w-[350px] flex-col rounded-2xl border-gray-200 p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notification</h5>
        </div>
        <ul className="custom-scrollbar flex h-auto flex-col overflow-y-auto">
          {notifications.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications
            </li>
          ) : (
            notifications.map((item) => {
              const content = (
                <span className="flex w-full gap-3">
                  {item.avatarUrl ? (
                    <span className="relative z-1 block h-10 w-full max-w-10 rounded-full">
                      <img
                        width={40}
                        height={40}
                        src={item.avatarUrl}
                        alt=""
                        className="w-full overflow-hidden rounded-full"
                      />
                    </span>
                  ) : null}
                  <span className="block min-w-0 flex-1">
                    <span className="mb-1.5 block text-theme-sm text-gray-800 dark:text-white/90">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                    ) : null}
                    {item.time ? (
                      <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                        {item.time}
                      </span>
                    ) : null}
                  </span>
                </span>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <DropdownMenuItem asChild>
                      <Link
                        to={item.href}
                        className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                      >
                        {content}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5">
                      {content}
                    </DropdownMenuItem>
                  )}
                </li>
              );
            })
          )}
        </ul>
        <Link
          to={viewAllHref}
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
