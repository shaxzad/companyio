import { Link, useParams } from 'react-router-dom';
import {
  Notice,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  surfaceClass,
  toast,
} from '@companyio/platform-ui';
import { useCreditSale } from '../../hooks';
import { formatMoney, toErrorMessage } from '../../utils';
import { useEffect } from 'react';

export default function CreditInvoicePage() {
  const { saleId = '' } = useParams();
  const { data: sale, error, isLoading } = useCreditSale(saleId);

  useEffect(() => {
    if (error) toast.error(toErrorMessage(error));
  }, [error]);

  const line = sale?.lines[0];
  const email = sale?.organization?.email?.trim();

  const openMail = () => {
    if (!sale || !email) {
      toast.error('This company has no email on file.');
      return;
    }
    const subject = encodeURIComponent(
      `Fuel invoice ${sale.invoiceNumber ?? sale.saleNumber} — ${sale.station.name}`
    );
    const body = encodeURIComponent(
      [
        `Invoice: ${sale.invoiceNumber ?? sale.saleNumber}`,
        `Company: ${sale.organization?.name ?? ''}`,
        `Vehicle: ${sale.vehicle?.registration ?? ''}`,
        `Driver: ${sale.driverName ?? '—'}`,
        `Product: ${line?.productName ?? ''}`,
        `Litres: ${sale.totalLitres}`,
        `Rate: ${formatMoney(line?.unitPrice ?? 0, { minimumFractionDigits: 2 })}`,
        `Amount: ${formatMoney(sale.totalAmount, { minimumFractionDigits: 2 })}`,
        `Date: ${new Date(sale.soldAt).toLocaleString()}`,
      ].join('\n')
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <PageMeta title="Credit invoice | Fuel Management" description="Preview and print credit invoice" />
      <PageShell>
        <PageHeader
          title="Credit invoice"
          description="Preview, print/download as PDF, or email using the company address on file."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/fleet-sales" className={secondaryActionClass}>
                New credit sale
              </Link>
              {sale?.organization?.id ? (
                <Link
                  to={`/credit-accounts?organizationId=${sale.organization.id}`}
                  className={secondaryActionClass}
                >
                  Company ledger
                </Link>
              ) : null}
            </div>
          }
        />

        {isLoading && <p className="text-sm text-gray-500">Loading invoice…</p>}
        {!isLoading && !sale && <Notice tone="error">Invoice not found.</Notice>}

        {sale && (
          <>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" className={primaryActionClass} onClick={() => window.print()}>
                Print / download PDF
              </button>
              <button
                type="button"
                className={secondaryActionClass}
                onClick={openMail}
                disabled={!email}
              >
                {email ? `Email ${email}` : 'No company email'}
              </button>
            </div>

            <section
              className={`${surfaceClass} mx-auto max-w-3xl p-8 print:max-w-none print:border-0 print:shadow-none`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                  {sale.station.logoUrl ? (
                    <img
                      src={sale.station.logoUrl}
                      alt={sale.station.name}
                      className="mb-3 h-12 object-contain"
                    />
                  ) : null}
                  <h2 className="text-xl font-semibold text-gray-900">{sale.station.name}</h2>
                  <p className="text-sm text-gray-500">{sale.station.address || sale.station.code}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                    Credit invoice
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">
                    {sale.invoiceNumber ?? sale.saleNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(sale.soldAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bill to</p>
                  <p className="mt-1 font-semibold text-gray-900">{sale.organization?.name}</p>
                  <p className="text-sm text-gray-600">{sale.organization?.address}</p>
                  <p className="text-sm text-gray-600">
                    {[sale.organization?.phone, sale.organization?.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {sale.vehicle?.registration ?? '—'}
                  </p>
                  <p className="text-sm text-gray-600">Driver: {sale.driverName || '—'}</p>
                  <p className="text-sm text-gray-600">Ref: {sale.saleNumber}</p>
                </div>
              </div>

              <table className="mt-8 w-full text-left text-sm">
                <thead className="border-y border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2 text-end">Litres</th>
                    <th className="py-2 text-end">Rate</th>
                    <th className="py-2 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.lines.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-3 font-medium">
                        {row.productName} ({row.productCode})
                      </td>
                      <td className="py-3 text-end tabular-nums">{row.litres.toLocaleString()}</td>
                      <td className="py-3 text-end tabular-nums">
                        {formatMoney(row.unitPrice, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-end font-semibold tabular-nums">
                        {formatMoney(row.amount, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 flex justify-end">
                <div className="min-w-[14rem] rounded-xl bg-brand-50 px-4 py-3 text-end dark:bg-brand-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Total due
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {formatMoney(sale.totalAmount, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {sale.notes ? (
                <p className="mt-6 text-sm text-gray-500">Notes: {sale.notes}</p>
              ) : null}
            </section>
          </>
        )}
      </PageShell>
    </>
  );
}
