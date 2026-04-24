import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, BookOpen } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Shepherd's Path] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-center gap-6">
          <BookOpen className="w-12 h-12 text-primary opacity-60" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Something interrupted the experience
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Take a breath — tap below to pick up where you left off.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMessage: "" });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh the app
          </button>
          {this.state.errorMessage ? (
            <p className="text-[11px] text-muted-foreground/50 max-w-xs break-all font-mono">
              {this.state.errorMessage}
            </p>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
