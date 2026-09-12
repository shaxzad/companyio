import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyMessage?: ReactNode;
  /** Tighter padding / smaller type for dense operational grids. */
  dense?: boolean;
  className?: string;
};

/**
 * Shared column-driven data table for product apps.
 * Pass columns + rows — do not copy static `<table>` markup per screen.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No rows to show.',
  dense = false,
  className = '',
}: DataTableProps<T>) {
  const headPad = dense ? 'px-3 py-2' : 'px-4 py-3';
  const cellPad = dense ? 'px-3 py-1.5' : 'px-4 py-3';

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full text-left text-sm text-gray-800 dark:text-gray-200">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-400">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`${headPad} ${column.headerClassName ?? column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className="align-middle">
              {columns.map((column) => (
                <td key={column.id} className={`${cellPad} ${column.className ?? ''}`}>
                  {column.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={`${cellPad} text-gray-500`} colSpan={Math.max(columns.length, 1)}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
