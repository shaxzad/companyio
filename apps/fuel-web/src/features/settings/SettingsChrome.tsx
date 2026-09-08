import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';
import { LiveBadge, PageHeader, PageShell } from '../../ui/page';

const TABS = [
  { to: '/settings/pump', label: 'Pump profile' },
  { to: '/settings/products', label: 'Products' },
  { to: '/settings/tanks', label: 'Tanks & meters' },
  { to: '/settings/denominations', label: 'Denominations' },
  { to: '/settings/rates', label: 'Selling rates' },
];

export function SettingsChrome({
  title,
  description,
  canEdit,
  children,
}: PropsWithChildren<{ title: string; description: string; canEdit: boolean }>) {
  return (
    <PageShell>
      <PageHeader
        title={title}
        description={description}
        action={<LiveBadge label={canEdit ? 'Owner can edit' : 'View only'} />}
      />
      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-semibold ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </PageShell>
  );
}
