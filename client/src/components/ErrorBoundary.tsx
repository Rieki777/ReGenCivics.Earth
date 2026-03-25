import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  prevPath: string;
}

function clearCacheAndReload() {
  if (typeof window.caches !== "undefined") {
    window.caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).then(() => {
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}

function DefaultFallback() {
  return (
    <section className="w-full min-h-[40vh] flex items-center justify-center bg-[#f0ebe3]/80 px-4 py-16">
      <div className="text-center max-w-md">
        <h2
          className="text-2xl font-bold text-[#1a472a] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Something went wrong
        </h2>
        <p className="text-[#4a5568] mb-6">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-full bg-[#1a472a] text-white text-sm font-semibold hover:bg-[#2d6a4f] transition-colors"
          >
            Go to Home
          </a>
          <button
            onClick={clearCacheAndReload}
            className="inline-block px-6 py-2.5 rounded-full border border-[#1a472a] text-[#1a472a] text-sm font-semibold hover:bg-[#1a472a]/10 transition-colors cursor-pointer"
          >
            Clear cache and reload
          </button>
        </div>
      </div>
    </section>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, prevPath: window.location.pathname };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    // Log to console so we can diagnose production crashes
    console.error("[ErrorBoundary] Caught error:", error?.message || error);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultFallback />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
