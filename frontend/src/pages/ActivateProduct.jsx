import ActivationPanel from "../components/modules/ActivationPanel.jsx";
import MyProductsStatusList from "../components/modules/MyProductsStatusList.jsx";
import { useProducts } from "../hooks/useProducts.js";
import { useMyProducts } from "../hooks/useMyProducts.js";

export default function ActivateProduct() {
  const { products, loading, refetch: refetchProducts } = useProducts();
  const { refetch: refetchMy } = useMyProducts();

  /**
   * Runs after a successful activation:
   *   - refresh the authorized-products list used across the app
   *     (Dashboard, Modules, My Learning all read from these same hooks
   *     on their own next mount/focus, but we also refresh here so this
   *     page's own "My Products" list updates immediately)
   *   - the newly unlocked module is now reflected in `products` with
   *     `unlocked: true`, which is what actually "unlocks" it anywhere
   *     ModuleCard/MyProductsStatusList reads from
   */
  const handleActivated = () => {
    refetchProducts();
    refetchMy();
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Activate Product</h1>
        <p className="mt-1 text-sm text-navy-400">
          Unlock a module by entering the product key you were given.
        </p>
      </div>

      <ActivationPanel onActivated={handleActivated} />

      <div>
        <h2 className="mb-3 font-semibold text-navy-900">My Products</h2>
        <MyProductsStatusList products={products} loading={loading} />
      </div>
    </div>
  );
}