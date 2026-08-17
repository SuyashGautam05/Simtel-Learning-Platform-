import { useCallback, useEffect, useState } from "react";
import { fetchProducts } from "../api/products";

/**
 * The single hook every "list of modules with lock state" screen uses
 * (Dashboard's authorized/locked grids, the Modules catalog page). Never
 * hides a locked module — the backend already tells us `unlocked` per
 * item, and this hook just exposes it, split for convenience.
 */
export function useProducts(params) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts(params));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const authorized = products.filter((p) => p.unlocked);
  const locked = products.filter((p) => !p.unlocked);

  return { products, authorized, locked, loading, error, refetch };
}