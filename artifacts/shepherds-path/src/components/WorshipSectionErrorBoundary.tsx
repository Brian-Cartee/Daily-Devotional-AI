import { Component, type ErrorInfo, type ReactNode } from "react";
import { Music2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps worship failures from crashing the full prayer closet / app shell. */
export class WorshipSectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[worship-bed]", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-amber-500/30 bg-black/40 backdrop-blur-md p-4 text-center"
          data-testid="worship-bed-error"
        >
          <Music2 className="w-5 h-5 text-amber-200/80 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-white">Worship music paused</p>
          <p className="text-[11px] text-white/50 mt-1 leading-snug">
            Something went wrong loading music. Your prayer closet is still here.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-3 rounded-lg px-4 py-2 text-[12px] font-semibold bg-violet-600 text-white hover:bg-violet-500"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
