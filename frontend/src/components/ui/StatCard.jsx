export default function StatCard({ icon: Icon, label, value, accent = false, delay = 0 }) {
  return (
    <div className="card animate-fade-in p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            accent ? "bg-gold-50 text-gold-700" : "bg-navy-50 text-navy"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-xs font-medium text-navy-400">{label}</p>
    </div>
  );
}