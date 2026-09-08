import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  AssignableFuelRoleSchema,
  authErrorMessage,
  type AssignableFuelRole,
} from '@companyio/auth-contracts';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import { ROLE_LABELS, ROLE_OPTIONS } from '../auth/roles';
import {
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  Surface,
  SurfaceHeader,
  primaryActionClass,
  secondaryActionClass,
} from '../../ui/page';

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
  const { client } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isCreate);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    client
      .listUsers()
      .then((users) => {
        const match = users.find((item) => item.id === userId);
        if (!match || match.role === 'owner') {
          navigate('/users', { replace: true });
          return;
        }
        setForm({
          name: match.name,
          email: match.email,
          password: '',
          role: match.role,
          isActive: match.isActive,
        });
      })
      .catch((caught) => setError(authErrorMessage(caught, 'Unable to load this user.')))
      .finally(() => setIsLoading(false));
  }, [client, navigate, userId]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (isCreate) {
        await client.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      } else if (userId) {
        await client.updateUser(userId, {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      }
      navigate('/users', { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught, 'Unable to save the user.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
              <Link to="/users" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                Back to users
              </Link>
            }
          />
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            {error && <Notice tone="error">{error}</Notice>}
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
