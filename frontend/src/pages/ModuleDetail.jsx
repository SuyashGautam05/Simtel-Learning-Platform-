import ProductAccessGuard from "../routes/ProductAccessGuard.jsx";
import ModuleDetailContent from "./ModuleDetailContent.jsx";

/**
 * The route element for /modules/:productId. All authorization logic
 * lives in ProductAccessGuard — this file only decides what renders once
 * access is confirmed.
 */
export default function ModuleDetail() {
  return (
    <ProductAccessGuard>
      <ModuleDetailContent />
    </ProductAccessGuard>
  );
}