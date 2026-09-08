import type { ProfileCardProps } from './types';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const links = [
  ['facebookUrl', 'Facebook'],
  ['xUrl', 'X.com'],
  ['linkedinUrl', 'LinkedIn'],
  ['instagramUrl', 'Instagram'],
] as const;

export default function UserMetaCard({ profile, onChange, onSave, isSaving }: ProfileCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const save = async () => {
    await onSave();
    closeModal();
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center w-full gap-6">
          <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
            <img src="/images/user/owner.jpg" alt="user" />
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {profile.firstName} {profile.lastName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.bio || 'CompanyIO member'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={openModal}>
          Edit
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
        {links.map(
          ([field, label]) =>
            profile[field] && (
              <a
                key={field}
                href={profile[field]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-500 hover:text-brand-600"
              >
                {label}
              </a>
            )
        )}
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Social Links
          </h4>
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {links.map(([field, label]) => (
              <div key={field}>
                <Label>{label}</Label>
                <Input
                  type="url"
                  value={profile[field]}
                  onChange={(event) => onChange(field, event.target.value)}
                />
              </div>
            ))}
            <div className="flex justify-end gap-3">
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
