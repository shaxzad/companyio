import { PageMeta } from '@companyio/platform-ui';

type FuelModulePageProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export default function FuelModulePage({ title, description, actionLabel = 'Add record' }: FuelModulePageProps) {
  return (
    <>
      <PageMeta title={`${title} | Fuel Management`} description={description} />
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Fuel operations</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <button className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
            {actionLabel}
          </button>
        </header>
        <section className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">{title} workspace</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This page is connected to the fuel application structure and ready for its API-backed workflow.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {['Records today', 'Pending review', 'This month'].map((label) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">--</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}