import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { authErrorMessage, UpdateProfileInput, User } from '@companyio/auth-contracts';
import { PageMeta, UserAddressCard, UserInfoCard, UserMetaCard } from '@companyio/platform-ui';
import { ROLE_LABELS, roleOf } from '../features/auth/roles';
import { LiveBadge, Notice, PageHeader, PageShell } from '../ui/page';

const profileFromUser = (user: User): UpdateProfileInput => ({
  firstName: user.firstName ?? user.name.split(' ')[0] ?? '',
  lastName: user.lastName ?? user.name.split(' ').slice(1).join(' ') ?? '',
  email: user.email,
  phone: user.phone ?? '',
  bio: user.bio ?? '',
  facebookUrl: user.facebookUrl ?? '',
  xUrl: user.xUrl ?? '',
  linkedinUrl: user.linkedinUrl ?? '',
  instagramUrl: user.instagramUrl ?? '',
  main_business_id: user.main_business_id,
  branch_id: user.branch_id,
});

export default function UserProfiles() {
  const { client, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const role = roleOf(user);
  const [profile, setProfile] = useState<UpdateProfileInput | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) setProfile(profileFromUser(user));
  }, [user]);

  if (isLoading)
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user || !profile) {
    if (!user) navigate('/signin', { replace: true });
    return null;
  }

  const updateField = <K extends keyof UpdateProfileInput>(
    field: K,
    value: UpdateProfileInput[K]
  ) => {
    setProfile((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const savedUser = await client.updateProfile(profile);
      setProfile(profileFromUser(savedUser));
      setSuccess('Profile updated successfully.');
    } catch (caught) {
      setError(authErrorMessage(caught, 'Unable to update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Profile | Fuel Management" description="Manage your fuel management profile" />
      <PageShell>
        <PageHeader
          title={user.name}
          description={`Signed in as ${role ? ROLE_LABELS[role] : 'user'} · ${user.email}`}
          action={<LiveBadge label="Your account" />}
        />

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        <UserMetaCard
          profile={profile}
          onChange={updateField}
          onSave={saveProfile}
          isSaving={isSaving}
        />
        <UserInfoCard
          profile={profile}
          onChange={updateField}
          onSave={saveProfile}
          isSaving={isSaving}
        />
        <UserAddressCard
          profile={profile}
          onChange={updateField}
          onSave={saveProfile}
          isSaving={isSaving}
        />
      </PageShell>
    </>
  );
}
