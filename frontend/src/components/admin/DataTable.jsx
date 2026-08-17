import EmptyState from "../ui/EmptyState.jsx";

/**
 * A plain, consistent table shell used by every Super Admin list section
 * (Colleges, Admins, Users, Products, Product Keys, Licenses, Audit Logs)
 * so each page only has to define its columns/rows, not reinvent table
 * chrome, loading state, or empty state.
 *
 * columns: [{ key, label, render?: (row) => node }]
 */
export default function DataTable({ columns, rows, loading, emptyMessage = "Nothing to show yet.", emptyIcon }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-navy-50/60" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-navy-50 text-xs font-semibold uppercase tracking-wide text-navy-400">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-50">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-navy-50/40">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-navy-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}