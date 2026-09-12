import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import type { User } from '@companyio/auth-contracts';
import { Badge, DataTable, type DataTableColumn, PageMeta } from '@companyio/platform-ui';
import { useUserMutations, useUsers } from '../../hooks';
import { toErrorMessage } from '../../utils';
import { ROLE_LABELS } from '../auth/roles';
import {
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  surfaceClass,
} from '../../ui/page';

export default function UsersPage() {
  const { user } = useAuth();
  const { data: users = [], isLoading, error: usersError } = useUsers();
  const { updateUser } = useUserMutations();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const displayError =
    error || (usersError ? toErrorMessage(usersError, 'Unable to load users.') : '');

  const setActive = async (target: User, isActive: boolean) => {
    setPendingId(target.id);
    setError('');
    setStatus('');
    try {
      await updateUser.mutateAsync({ id: target.id, data: { isActive } });
      setStatus(
        isActive ? `${target.name} has been reactivated.` : `${target.name} has been deactivated.`
      );
    } catch (caught) {
      setError(toErrorMessage(caught, 'Unable to update the user.'));
    } finally {
      setPendingId(null);
    }
  };

  const activeCount = users.filter((item) => item.isActive).length;

  const userColumns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        className: 'font-medium text-gray-800 dark:text-gray-200',
        cell: (item) => item.name,
      },
      {
        id: 'email',
        header: 'Email',
        className: 'text-gray-800 dark:text-gray-200',
        cell: (item) => item.email,
      },
      {
        id: 'role',
        header: 'Role',
        cell: (item) => (
          <span className="rounded-lg bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700">
            {ROLE_LABELS[item.role]}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (item) => (
          <Badge variant={item.isActive ? 'success' : 'error'}>
            {item.isActive ? 'Active' : 'Deactivated'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        className: 'text-end',
        headerClassName: 'text-end',
        cell: (item) => {
          const isSelf = item.id === user?.id;
          const isOwner = item.role === 'owner';
          return (
            <div className="flex justify-end gap-2">
              {!isOwner && (
                <Link
                  to={`/users/${item.id}`}
                  className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
                >
                  Edit
                </Link>
              )}
              {!isOwner && !isSelf && (
                <button
                  type="button"
                  className={
                    item.isActive
                      ? 'inline-flex items-center justify-center rounded-lg bg-error-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-error-400 disabled:opacity-50'
                      : `${secondaryActionClass} !px-3 !py-1.5 text-xs`
                  }
                  disabled={pendingId === item.id}
                  onClick={() => void setActive(item, !item.isActive)}
                >
                  {item.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [pendingId, user?.id]
  );

  return (
    <>
      <PageMeta
        title="Users | Fuel Management"
        description="Create and deactivate pump users and assign roles"
      />
      <PageShell>
        <PageHeader
          title="Users"
          description="Create staff accounts and assign Owner, Manager, Staff / Cashier, or Accountant access."
          action={
            <Link to="/users/new" className={primaryActionClass}>
              Add user
            </Link>
          }
        />

        {displayError && <Notice tone="error">{displayError}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Team members"
            value={isLoading ? '--' : String(users.length)}
            detail="Accounts at this station"
            tone="text-brand-600"
          />
          <KpiCard
            label="Active"
            value={isLoading ? '--' : String(activeCount)}
            detail="Can sign in today"
            tone="text-success-600"
          />
          <KpiCard
            label="Deactivated"
            value={isLoading ? '--' : String(users.length - activeCount)}
            detail="Blocked from the till"
            tone="text-error-600"
          />
        </section>

        <section className={surfaceClass}>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Station users</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Roles control which screens each person can open
              </p>
            </div>
          </div>
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-gray-500">Loading users...</p>
          ) : (
            <DataTable
              columns={userColumns}
              rows={users}
              getRowKey={(item) => item.id}
              emptyMessage="No users yet. Add a manager, cashier, or accountant."
            />
          )}
        </section>
      </PageShell>
    </>
  );
}
