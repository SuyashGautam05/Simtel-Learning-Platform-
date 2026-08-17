export default function AdminPageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}