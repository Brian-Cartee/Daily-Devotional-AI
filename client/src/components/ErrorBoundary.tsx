import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, BookOpen } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
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
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              We're sorry for the interruption. Tap below to get back to your devotional.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh the app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
