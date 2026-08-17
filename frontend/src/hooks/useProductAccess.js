import { useCallback, useEffect, useState } from "react";
import { fetchProductAccess } from "../api/products";

/**
 * The ONE place that answers "does the current user have access to this
 * specific product." ProductAccessGuard uses this; anything else that
 * needs the same answer (a module detail page's header, a "renew access"
 * banner) should use this hook too, rather than re-implementing the
 * check. The backend is still the real gate — this hook mirrors what the
 * backend has already decided, purely for rendering.
 */
export function useProductAccess(productId) {
  const [state, setState] = useState({
    loading: true,
    hasAccess: false,
    product: null,
    expiresAt: null,
    notFound: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!productId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchProductAccess(productId);
      setState({
        loading: false,
        hasAccess: data.hasAccess,
        product: data.product,
        expiresAt: data.expiresAt,
        notFound: false,
        error: null,
      });
    } catch (err) {
      const notFound = err.response?.status === 404;
      setState({
        loading: false,
        hasAccess: false,
        product: null,
        expiresAt: null,
        notFound,
        error: notFound ? null : err,
      });
    }
  }, [productId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}