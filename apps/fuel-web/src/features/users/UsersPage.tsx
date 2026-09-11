import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import type { User } from '@companyio/auth-contracts';
import { Badge, PageMeta } from '@companyio/platform-ui';
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
            tone="text-sky-600"
          />
          <KpiCard
            label="Active"
            value={isLoading ? '--' : String(activeCount)}
            detail="Can sign in today"
            tone="text-emerald-600"
          />
          <KpiCard
            label="Deactivated"
            value={isLoading ? '--' : String(users.length - activeCount)}
            detail="Blocked from the till"
            tone="text-rose-600"
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((item) => {
                  const isSelf = item.id === user?.id;
                  const isOwner = item.role === 'owner';
                  return (
                    <tr key={item.id} className="text-gray-800 dark:text-gray-200">
                      <td className="px-5 py-4 font-medium">{item.name}</td>
                      <td className="px-5 py-4">{item.email}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
                          {ROLE_LABELS[item.role]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={item.isActive ? 'success' : 'error'}>
                          {item.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
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
                                  ? 'inline-flex items-center justify-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50'
                                  : `${secondaryActionClass} !px-3 !py-1.5 text-xs`
                              }
                              disabled={pendingId === item.id}
                              onClick={() => void setActive(item, !item.isActive)}
                            >
                              {item.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {isLoading && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={5}>
                      Loading users...
                    </td>
                  </tr>
                )}
                {!isLoading && users.length === 0 && !displayError && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={5}>
                      No users yet. Add a manager, cashier, or accountant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </PageShell>
    </>
  );
}
