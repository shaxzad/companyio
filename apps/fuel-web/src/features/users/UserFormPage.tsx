import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AssignableFuelRoleSchema,
  type AssignableFuelRole,
} from '@companyio/auth-contracts';
import {
  Input,
  Label,
  LiveBadge,
  Notice,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  Select,
  Surface,
  SurfaceHeader,
} from '@companyio/platform-ui';
import { useUser, useUserMutations } from '../../hooks';
import { toErrorMessage } from '../../utils';
import { ROLE_LABELS, ROLE_OPTIONS } from '../auth/roles';
type FormState = {
  name: string;
  email: string;
  password: string;
  role: AssignableFuelRole;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  role: 'staff',
  isActive: true,
});

export default function UserFormPage() {
  const { userId } = useParams();
  const isCreate = !userId;
  const navigate = useNavigate();
  const { data: existingUser, isLoading, error: userError, isFetched } = useUser(userId);
  const { createUser, updateUser } = useUserMutations();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isCreate || !isFetched) return;
    if (!existingUser || existingUser.role === 'owner') {
      navigate('/users', { replace: true });
      return;
    }
    setForm({
      name: existingUser.name,
      email: existingUser.email,
      password: '',
      role: existingUser.role,
      isActive: existingUser.isActive,
    });
  }, [existingUser, isCreate, isFetched, navigate]);

  const displayError =
    error || (userError ? toErrorMessage(userError, 'Unable to load this user.') : '');
  const isSaving = createUser.isPending || updateUser.isPending;

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (isCreate) {
        await createUser.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      } else if (userId) {
        await updateUser.mutateAsync({
          id: userId,
          data: {
            name: form.name,
            email: form.email,
            role: form.role,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          },
        });
      }
      navigate('/users', { replace: true });
    } catch (caught) {
      setError(toErrorMessage(caught, 'Unable to save the user.'));
    }
  };

  if (!isCreate && isLoading) {
    return (
      <PageShell>
        <p className="py-12 text-sm text-gray-500">Loading user...</p>
      </PageShell>
    );
  }

  return (
    <>
      <PageMeta
        title={`${isCreate ? 'Add user' : 'Edit user'} | Fuel Management`}
        description="Assign a role and activate or deactivate a pump user"
      />
      <PageShell>
        <PageHeader
          title={isCreate ? 'Add user' : 'Edit user'}
          description="Assign Manager, Staff / Cashier, or Accountant. The first sign-up remains the owner."
          action={<LiveBadge label={isCreate ? 'New account' : 'Editing user'} />}
        />

        <Surface>
          <SurfaceHeader
            title="Account details"
            description={`Current role: ${ROLE_LABELS[form.role]}. Staff enter daily figures. Accountants see credit and reports.`}
            action={
              <Link to="/users" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Back to users
              </Link>
            }
          />
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            {displayError && <Notice tone="error">{displayError}</Notice>}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ali Khan"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. cashier@station.com"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Password{isCreate ? '' : ' (leave blank to keep the current password)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isCreate ? 'At least 8 characters' : 'Leave blank to keep current'}
                  value={form.password}
                  minLength={isCreate ? 8 : undefined}
                  onChange={(event) => update('password', event.target.value)}
                  required={isCreate}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  options={ROLE_OPTIONS}
                  placeholder="Select a role"
                  value={form.role}
                  onChange={(value) => {
                    const parsed = AssignableFuelRoleSchema.safeParse(value);
                    if (parsed.success) update('role', parsed.data);
                  }}
                />
              </div>
            </div>
            {!isCreate && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => update('isActive', event.target.checked)}
                />
                Active (can sign in)
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Link to="/users" className={secondaryActionClass}>
                Cancel
              </Link>
              <button type="submit" className={primaryActionClass} disabled={isSaving}>
                {isSaving ? 'Saving...' : isCreate ? 'Create user' : 'Save user'}
              </button>
            </div>
          </form>
        </Surface>
      </PageShell>
    </>
  );
}
