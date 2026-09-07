import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { UpdateProfileInput, User } from '@companyio/auth-contracts';
import {
  PageBreadcrumb,
  PageMeta,
  UserAddressCard,
  UserInfoCard,
  UserMetaCard,
} from '@companyio/platform-ui';

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
      setError(caught instanceof Error ? caught.message : 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="CompanyIO Profile" description="Manage your CompanyIO profile" />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Profile</h3>
        <p className="mb-7 text-sm text-gray-500 dark:text-gray-400">
          Update your details to keep your profile up-to-date.
        </p>
        {error && <p className="mb-4 text-sm text-error-500">{error}</p>}
        {success && <p className="mb-4 text-sm text-success-500">{success}</p>}
        <div className="space-y-6">
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
        </div>
      </div>
    </>
  );
}
