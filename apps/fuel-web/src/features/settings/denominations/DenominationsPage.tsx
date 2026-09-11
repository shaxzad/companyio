import { useState } from 'react';
import { PageMeta } from '@companyio/platform-ui';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  useCashCountDraft,
  useDenominationMutations,
  useDenominations,
} from '../../../hooks';
import type { CashDenomination } from '../../../types';
import { toErrorMessage } from '../../../utils';
import { canEditPath, roleOf } from '../../auth/roles';
import { Notice } from '../../../ui/page';
import { SettingsChrome } from '../SettingsChrome';
import { CashCountingBoard } from './CashCountingBoard';
import { ManageDenominations } from './ManageDenominations';

export default function DenominationsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { data: rows = [], error: rowsError, isLoading } = useDenominations();
  const { createDenomination, loadDefaults, updateDenomination } = useDenominationMutations();
  const { lines, totalCash, setCount, bumpCount, clearCounts } = useCashCountDraft(rows);
  const [pageError, setPageError] = useState('');

  const sortedRows = [...rows].sort((a, b) => Number(b.value) - Number(a.value));

  return (
    <>
      <PageMeta
        title="Cash count | Fuel Management"
        description="Count cash notes for daily closing"
      />
      <SettingsChrome
        title="Cash closing"
        description="Count each note denomination. Amount and total update as you type — no manual math."
        canEdit={canEdit}
      >
        {(pageError || rowsError) && (
          <Notice tone="error">{pageError || toErrorMessage(rowsError)}</Notice>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading denominations…</p>
        ) : (
          <CashCountingBoard
            lines={lines}
            totalCash={totalCash}
            onCountChange={setCount}
            onBump={bumpCount}
            onClear={clearCounts}
            emptyHint={
              rows.length === 0
                ? 'No notes configured. Open Manage denominations and load PKR defaults.'
                : 'All notes are inactive. Activate at least one under Manage denominations.'
            }
          />
        )}

        <ManageDenominations
          canEdit={canEdit}
          rows={sortedRows}
          defaultOpen={rows.length === 0}
          createPending={createDenomination.isPending}
          loadDefaultsPending={loadDefaults.isPending}
          onCreate={async (input) => {
            setPageError('');
            await createDenomination.mutateAsync(input);
          }}
          onToggleActive={async (row: CashDenomination) => {
            setPageError('');
            await updateDenomination.mutateAsync({ id: row.id, data: { active: !row.active } });
          }}
          onLoadDefaults={async () => {
            setPageError('');
            await loadDefaults.mutateAsync();
          }}
        />
      </SettingsChrome>
    </>
  );
}
