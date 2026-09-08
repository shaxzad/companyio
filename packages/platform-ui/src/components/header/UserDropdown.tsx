import { useState } from 'react';
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

export default function UserDropdown() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
          className="h-auto gap-3 px-2 py-1 text-gray-700 shadow-none hover:bg-transparent dark:text-gray-400"
        >
          <Avatar src="/images/user/owner.jpg" alt="User" size="medium" className="size-11" />
          <span className="block font-medium text-theme-sm">Musharof</span>
          <svg
            className="stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 group-data-[state=open]:rotate-180"
            width="18"
            height="20"
            viewBox="0 0 18 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[260px] rounded-2xl border-gray-200 p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-2 py-1">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            Musharof Chowdhury
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            randomuser@pimjo.com
          </span>
        </div>
        <DropdownMenuSeparator className="my-2 bg-gray-200 dark:bg-gray-800" />
        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm"
          >
            Edit profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm"
          >
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm"
          >
            Support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-gray-200 dark:bg-gray-800" />
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={() => {
            void handleSignOut();
          }}
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
