import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable, type DataTableColumn, PageMeta, Select } from '@companyio/platform-ui';
import { useCompanyLedger, useOrganizations } from '../../hooks';
import type { LedgerEntry } from '../../types';
import { formatMoney, toErrorMessage } from '../../utils';
import { toast } from '../../ui/toast';
import {
  KpiCard,
  LiveBadge,
  PageHeader,
  PageShell,
  Surface,
  SurfaceHeader,
  secondaryActionClass,
} from '../../ui/page';

export default function CompanyLedgerPage() {
  const [params, setParams] = useSearchParams();
  const organizationId = params.get('organizationId') ?? '';
  const { data: companies = [] } = useOrganizations({ includeInactive: true });
  const { data: ledger, error, isLoading } = useCompanyLedger(organizationId || undefined);

  useEffect(() => {
    if (error) toast.error(toErrorMessage(error));
  }, [error]);

  useEffect(() => {
    if (!organizationId && companies.length === 1) {
      setParams({ organizationId: companies[0].id });
    }
  }, [companies, organizationId, setParams]);

  const columns = useMemo<DataTableColumn<LedgerEntry>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        cell: (row) => new Date(row.date).toLocaleString(),
      },
      {
        id: 'type',
        header: 'Type',
        cell: (row) => row.type,
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: (row) =>
          row.saleId ? (
            <Link
              to={`/credit-sales/${row.saleId}/invoice`}
              className="font-medium text-brand-600 hover:underline"
            >
              {row.reference}
            </Link>
          ) : (
            row.reference
          ),
      },
      {
        id: 'description',
        header: 'Description',
        cell: (row) => row.description,
      },
      {
        id: 'debit',
        header: 'Debit',
        className: 'text-end tabular-nums',
        headerClassName: 'text-end',
        cell: (row) => (row.debit ? formatMoney(row.debit, { minimumFractionDigits: 2 }) : '—'),
      },
      {
        id: 'credit',
        header: 'Credit',
        className: 'text-end tabular-nums',
        headerClassName: 'text-end',
        cell: (row) => (row.credit ? formatMoney(row.credit, { minimumFractionDigits: 2 }) : '—'),
      },
      {
        id: 'balance',
        header: 'Balance',
        className: 'text-end font-semibold tabular-nums',
        headerClassName: 'text-end',
        cell: (row) => formatMoney(row.balance, { minimumFractionDigits: 2 }),
      },
    ],
    []
  );

  return (
    <>
      <PageMeta title="Company ledger | Fuel Management" description="Credit outstanding by company" />
      <PageShell>
        <PageHeader
          title="Company ledger"
          description="Opening balance + credit fuel − payments = outstanding. Concept A receivables only."
          action={<LiveBadge label="Credit accounts" />}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[16rem]">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company
            </label>
            <Select
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
              placeholder="Select company"
              value={organizationId}
              onChange={(value) => setParams(value ? { organizationId: value } : {})}
            />
          </div>
          <Link to="/fleet-sales" className={secondaryActionClass}>
            New credit sale
          </Link>
        </div>

        {organizationId && ledger && (
          <section className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Opening balance"
              value={formatMoney(ledger.organization.openingBalance, { minimumFractionDigits: 2 })}
              detail="Brought forward"
            />
            <KpiCard
              label="Credit limit"
              value={formatMoney(ledger.organization.creditLimit, { minimumFractionDigits: 2 })}
              detail={ledger.organization.creditType ?? '—'}
            />
            <KpiCard
              label="Outstanding"
              value={formatMoney(ledger.outstanding, { minimumFractionDigits: 2 })}
              detail="Current receivable"
              tone="text-brand-600"
            />
          </section>
        )}

        <Surface>
          <SurfaceHeader
            title={ledger?.organization.name ?? 'Ledger'}
            description="Outstanding = previous balance + new credit − payments received."
          />
          {!organizationId ? (
            <p className="text-sm text-gray-500">Select a company to view its ledger.</p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Loading ledger…</p>
          ) : (
            <DataTable
              dense
              columns={columns}
              rows={ledger?.ledger ?? []}
              getRowKey={(row, index) => `${row.type}-${row.reference}-${index}`}
              emptyMessage="No ledger entries yet."
            />
          )}
        </Surface>
      </PageShell>
    </>
  );
}
