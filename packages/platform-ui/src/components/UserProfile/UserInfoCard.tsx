import type { ProfileCardProps } from './types';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function UserInfoCard({ profile, onChange, onSave, isSaving }: ProfileCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const save = async () => {
    await onSave();
    closeModal();
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <Value label="First Name" value={profile.firstName} />
            <Value label="Last Name" value={profile.lastName} />
            <Value label="Email address" value={profile.email} />
            <Value label="Phone" value={profile.phone || 'Not provided'} />
            <Value label="Bio" value={profile.bio || 'Not provided'} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={openModal}>
          Edit
        </Button>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Personal Information
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Update your details to keep your profile up-to-date.
          </p>
          <form
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div>
              <Label>First Name</Label>
              <Input
                value={profile.firstName}
                onChange={(event) => onChange('firstName', event.target.value)}
                required
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={profile.lastName}
                onChange={(event) => onChange('lastName', event.target.value)}
                required
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(event) => onChange('email', event.target.value)}
                required
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={profile.phone}
                onChange={(event) => onChange('phone', event.target.value)}
              />
            </div>
            <div className="lg:col-span-2">
              <Label>Bio</Label>
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={profile.bio}
                onChange={(event) => onChange('bio', event.target.value)}
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-end gap-3 lg:col-span-2">
              <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

const Value = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
  </div>
);
