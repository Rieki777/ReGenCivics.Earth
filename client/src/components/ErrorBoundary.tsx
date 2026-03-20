import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <AlertTriangle
            size={48}
            className="text-destructive mb-6 flex-shrink-0"
          />

          <h2 className="text-2xl font-semibold mb-4">Something went wrong</h2>

          <p className="text-white/60 mb-6">An unexpected error occurred on this page.</p>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <a
              href="/"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
            >
              Go home
            </a>
            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
