import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { fetchModuleLaunch, fetchModuleState, saveModuleState } from "../../api/moduleIntegration.js";

/**
 * <SimulatorFrame productId="..." />
 * -----------------------------------------------------------------------
 * The entire platform-side implementation of the module integration
 * contract described in MODULE_INTEGRATION.md. This is the ONLY place
 * the platform talks to a simulation module's runtime.
 *
 * Zero-effort path (works with any existing simulator, unmodified):
 *   The iframe just loads `entryPointUrl`. The platform has already
 *   confirmed authorization before handing back that URL — the module
 *   itself doesn't need to know or check anything about licenses, users,
 *   or auth. This is what makes "don't rewrite existing simulation code"
 *   possible: a static HTML/Canvas/Three.js/whatever bundle that already
 *   exists needs exactly zero changes to be embedded.
 *
 * Opt-in enhanced path (a module can adopt this later, incrementally):
 *   - The launch token + user/product identity are appended as URL query
 *     params AND offered via postMessage, so a module can read whichever
 *     it finds easier.
 *   - The module may postMessage `{ type: "simtel:ready" }` once loaded;
 *     the platform responds with `{ type: "simtel:init", ... }`.
 *   - The module may postMessage `{ type: "simtel:save-state", payload }`
 *     at any time; the platform persists `payload` opaquely via
 *     PUT /api/products/:id/state and does not interpret it.
 *   - The module may postMessage `{ type: "simtel:exit" }` to ask the
 *     platform to navigate back out of the simulator view.
 *   All postMessage traffic is restricted to the entryPointUrl's own
 *   origin — the platform never sends the launch token to any origin
 *   other than the one it was issued for.
 * -----------------------------------------------------------------------
 */
export default function SimulatorFrame({ productId, onExit }) {
  const iframeRef = useRef(null);
  const [launch, setLaunch] = useState(null);
  const [savedState, setSavedState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const moduleOrigin = launch?.entryPointUrl ? new URL(launch.entryPointUrl).origin : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchModuleLaunch(productId), fetchModuleState(productId).catch(() => ({ data: null }))])
      .then(([launchPayload, statePayload]) => {
        if (cancelled) return;
        setLaunch(launchPayload);
        setSavedState(statePayload.data ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 409
            ? "This module doesn't have an interactive simulator configured yet."
            : "Couldn't load the simulator. Please try again."
        );
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  // The platform → module postMessage handshake, and the module → platform
  // event listener. Only wired up once we know the module's real origin,
  // and every message is checked against it — this is what stops a
  // compromised or malicious page from pretending to be the module and
  // harvesting the launch token via a forged "ready" message.
  const handleMessage = useCallback(
    (event) => {
      if (!moduleOrigin || event.origin !== moduleOrigin) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      switch (msg.type) {
        case "simtel:ready": {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "simtel:init",
              launchToken: launch.launchToken,
              user: launch.user,
              product: launch.product,
              savedState,
            },
            moduleOrigin
          );
          break;
        }
        case "simtel:save-state": {
          saveModuleState(productId, msg.payload).catch(() => {
            // Best-effort — a failed save shouldn't crash the simulator;
            // the module can retry on its own next save trigger.
          });
          break;
        }
        case "simtel:exit": {
          onExit?.();
          break;
        }
        default:
          break;
      }
    },
    [moduleOrigin, launch, savedState, productId, onExit]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-100 border-t-navy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-2 p-10 text-center">
        <AlertTriangle size={24} className="text-navy-300" />
        <p className="text-sm text-navy-400">{error}</p>
      </div>
    );
  }

  // Zero-effort loading: the entry point URL alone. Query params are an
  // opt-in convenience for a module that wants to read them without any
  // postMessage code — appended, never required.
  const src = `${launch.entryPointUrl}${launch.entryPointUrl.includes("?") ? "&" : "?"}launchToken=${encodeURIComponent(
    launch.launchToken
  )}&userId=${encodeURIComponent(launch.user.id)}&productId=${encodeURIComponent(launch.product.id)}`;

  return (
    <div className={fullscreen ? "fixed inset-0 z-40 bg-navy-950" : "relative"}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-navy-400">
          {launch.product.name} <span className="text-navy-300">v{launch.product.version}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload simulator"
            className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={src}
        title={launch.product.name}
        className={`w-full rounded-xl border border-navy-100 bg-white ${fullscreen ? "h-[calc(100vh-3rem)]" : "h-[75vh]"}`}
        // allow-same-origin + allow-scripts is required for most existing
        // simulators (canvas/localStorage/etc.) — this is first-party
        // content the platform owner controls, just independently hosted,
        // not arbitrary third-party content, so this sandbox profile is
        // appropriate. allow-popups/allow-forms cover simulators that open
        // help dialogs or have their own in-page forms.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
        allow="fullscreen; autoplay"
      />
    </div>
  );
}