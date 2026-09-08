import type { ProfileCardProps } from './types';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function UserAddressCard({ profile, onChange, onSave, isSaving }: ProfileCardProps) {
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
            Organization
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7">
            <Value label="Main Business ID" value={profile.main_business_id} />
            <Value label="Branch ID" value={profile.branch_id} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={openModal}>
          Edit
        </Button>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h4 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Organization
          </h4>
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div>
              <Label>Main Business ID</Label>
              <Input
                placeholder="Enter main business ID"
                value={profile.main_business_id}
                onChange={(event) => onChange('main_business_id', event.target.value)}
                required
              />
            </div>
            <div>
              <Label>Branch ID</Label>
              <Input
                placeholder="Enter branch ID"
                value={profile.branch_id}
                onChange={(event) => onChange('branch_id', event.target.value)}
                required
              />
            </div>
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

const Value = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
  </div>
);
