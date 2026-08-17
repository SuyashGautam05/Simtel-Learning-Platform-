export default function EmptyState({ icon: Icon, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-8 text-center">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-300">
          <Icon size={18} />
        </div>
      )}
      <p className="text-sm text-navy-400">{message}</p>
      {action}
    </div>
  );
}