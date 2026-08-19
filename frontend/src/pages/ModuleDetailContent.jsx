import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Cpu, FlaskConical, PlayCircle } from "lucide-react";
import { fetchProductTopics, fetchProductSimulations, fetchProductExperiments } from "../api/products.js";
import { useProductAccess } from "../hooks/useProductAccess.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SimulatorFrame from "../components/simulators/SimulatorFrame.jsx";

const CONTENT_TABS = [
  { key: "topics", label: "Topics", icon: BookOpen, fetcher: fetchProductTopics },
  { key: "simulations", label: "Simulations", icon: Cpu, fetcher: fetchProductSimulations },
  { key: "experiments", label: "Experiments", icon: FlaskConical, fetcher: fetchProductExperiments },
];

export default function ModuleDetailContent() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product } = useProductAccess(productId);
  // Defaults to the live simulator when one is configured for this module
  // (product.integrationType === "IFRAME"); falls back to the content
  // tabs otherwise. See MODULE_INTEGRATION.md.
  const [activeTab, setActiveTab] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasSimulator = product?.integrationType === "IFRAME" && !!product?.entryPointUrl;

  useEffect(() => {
    if (product && activeTab === null) {
      setActiveTab(hasSimulator ? "simulator" : "topics");
    }
  }, [product, hasSimulator, activeTab]);

  useEffect(() => {
    const tab = CONTENT_TABS.find((t) => t.key === activeTab);
    if (!tab || !productId) return;
    setLoading(true);
    tab
      .fetcher(productId)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [activeTab, productId]);

  const tabs = [
    ...(hasSimulator ? [{ key: "simulator", label: "Simulator", icon: PlayCircle }] : []),
    ...CONTENT_TABS,
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-navy-300">{product?.code}</p>
        <h1 className="text-2xl font-bold text-navy-900">{product?.name}</h1>
        {product?.description && <p className="mt-1 max-w-2xl text-sm text-navy-400">{product.description}</p>}
      </div>

      <div className="flex gap-2 border-b border-navy-100">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === key
                ? "border-navy text-navy"
                : "border-transparent text-navy-400 hover:text-navy-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "simulator" ? (
        <SimulatorFrame productId={productId} onExit={() => navigate("/modules")} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-navy-50/60" />
          ))}
        </div>
      ) : !content?.available ? (
        <EmptyState
          message={
            content?.message ||
            "This content hasn't been built for this module yet — check back soon."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {content.items.map((item) => (
            <div key={item.id} className="card p-4">
              <p className="font-semibold text-navy-900">{item.title}</p>
              {item.durationMinutes && (
                <p className="mt-1 text-xs text-navy-400">{item.durationMinutes} min</p>
              )}
              {item.questionCount && (
                <p className="mt-1 text-xs text-navy-400">{item.questionCount} questions</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}