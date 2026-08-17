export default function ProgressBar({ percent = 0, className = "" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-navy-100 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-navy to-navy-600 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}