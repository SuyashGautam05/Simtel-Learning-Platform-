const TONE = {
  ACTIVE: "bg-gold-50 text-gold-700",
  UNUSED: "bg-navy-50 text-navy-500",
  DRAFT: "bg-navy-50 text-navy-500",
  SUSPENDED: "bg-red-50 text-red-600",
  REVOKED: "bg-red-50 text-red-600",
  EXPIRED: "bg-red-50 text-red-600",
  EXHAUSTED: "bg-navy-50 text-navy-500",
  ARCHIVED: "bg-navy-50 text-navy-400",
  INACTIVE: "bg-navy-50 text-navy-400",
  PENDING: "bg-navy-50 text-navy-500",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        TONE[status] || "bg-navy-50 text-navy-500"
      }`}
    >
      {status}
    </span>
  );
}