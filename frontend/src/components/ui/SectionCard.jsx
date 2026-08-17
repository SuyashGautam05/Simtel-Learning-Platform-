import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * The consistent "titled section with optional 'view all' link" wrapper
 * used throughout the dashboard, so every section shares the same header
 * rhythm instead of each one inventing its own.
 */
export default function SectionCard({ title, subtitle, viewAllHref, icon: Icon, children, className = "" }) {
  return (
    <section className={`animate-fade-in ${className}`}>
      <div className="mb-4 flex items-end justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
              <Icon size={16} />
            </div>
          )}
          <div>
            <h2 className="font-bold text-navy-900">{title}</h2>
            {subtitle && <p className="text-xs text-navy-400">{subtitle}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-xs font-semibold text-navy hover:text-gold-600"
          >
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}