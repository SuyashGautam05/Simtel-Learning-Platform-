import { useParams } from "react-router-dom";
import { Lock, AlertTriangle } from "lucide-react";
import { useProductAccess } from "../hooks/useProductAccess";
import EnterProductKeyButton from "../components/modules/EnterProductKeyButton.jsx";

/**
 * <ProductAccessGuard>
 * Wraps a module-detail route. Reads :productId from the URL, checks
 * access via useProductAccess (which calls the same backend endpoint the
 * ModuleCard's lock state is built from — one source of truth), and:
 *   - shows a spinner while checking
 *   - shows a real "module not found" state for a bad/nonexistent id
 *   - shows a locked screen (never a silent redirect) if the user isn't
 *     authorized — so they understand *why*, and can act on it
 *   - renders children only once access is confirmed
 *
 * This is the ONLY place a module-detail route needs to think about
 * authorization. The backend is still the actual enforcement — this
 * component only decides what to render.
 */
export default function ProductAccessGuard({ children }) {
  const { productId } = useParams();
  const { loading, hasAccess, product, notFound, error, refetch } = useProductAccess(productId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-100 border-t-navy" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center animate-fade-in">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy">
          <AlertTriangle size={22} />
        </div>
        <h2 className="mt-4 font-semibold text-navy-900">Module not found</h2>
        <p className="mt-1 text-sm text-navy-400">
          This module doesn't exist or is no longer available.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center animate-fade-in">
        <p className="text-sm text-red-600">Something went wrong loading this module. Please try again.</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <Lock size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-navy-900">{product?.name || "This module"} is locked</h2>
        <p className="mt-2 text-sm text-navy-400">
          You need a valid product key to access this module. Enter your key below to unlock it.
        </p>
        <div className="mt-6 flex justify-center">
          <EnterProductKeyButton onActivated={refetch} />
        </div>
      </div>
    );
  }

  return children;
}