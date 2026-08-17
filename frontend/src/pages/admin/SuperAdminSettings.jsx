import { Settings, Mail, ShieldCheck, KeyRound } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";

/**
 * No platform-settings storage/API exists on the backend yet — this is
 * an honest placeholder, not a form wired to nothing. Settings that
 * currently live only in environment variables (JWT lifetimes, product
 * key pepper, rate limits, SMTP config) are listed here for visibility;
 * making them editable from the UI is future work that needs a real
 * settings model + API first.
 */
export default function SuperAdminSettings() {
  const items = [
    { icon: KeyRound, label: "Product key hashing pepper", value: "Configured via PRODUCT_KEY_PEPPER (server env)" },
    { icon: ShieldCheck, label: "Login rate limiting", value: "Configured via LOGIN_RATE_LIMIT_* (server env)" },
    { icon: Mail, label: "Cookie domain", value: "Configured via COOKIE_DOMAIN (server env)" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="System Settings" subtitle="Platform-wide configuration." />

      <div className="card p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy">
            <Settings size={17} />
          </div>
          <h2 className="font-semibold text-navy-900">Current configuration</h2>
        </div>
        <p className="mt-2 text-sm text-navy-400">
          These settings are currently managed via server environment variables, not this UI. An
          editable settings API hasn't been built yet — this section is a visibility placeholder
          for now.
        </p>

        <div className="mt-5 divide-y divide-navy-50">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-400">
                <Icon size={14} />
              </div>
              <div>
                <p className="text-sm font-medium text-navy-800">{label}</p>
                <p className="text-xs text-navy-400">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}