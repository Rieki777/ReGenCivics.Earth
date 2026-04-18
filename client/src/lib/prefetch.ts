const prefetched = new Set<string>();
const ROUTE_MODULES: Record<string, () => Promise<unknown>> = {
  "/fund": () => import("@/pages/Fund"),
  "/land": () => import("@/pages/Land"),
  "/ally": () => import("@/pages/Ally"),
  "/play": () => import("@/pages/Play"),
  "/quest": () => import("@/pages/Quest"),
  "/community": () => import("@/pages/Community"),
  "/governance": () => import("@/pages/Governance"),
  "/bionomics": () => import("@/pages/Bionomics"),
  "/tokenomics": () => import("@/pages/Tokenomics"),
  "/map": () => import("@/pages/Map"),
  "/blog": () => import("@/pages/Blog"),
  "/schedule": () => import("@/pages/Schedule"),
  "/tools": () => import("@/pages/ToolsLibrary"),
};

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = ROUTE_MODULES[path];
  if (loader) { prefetched.add(path); loader(); }
}
