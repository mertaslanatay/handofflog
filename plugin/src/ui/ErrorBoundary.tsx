import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | undefined;
}

/**
 * Catches render-time errors in the UI tree so a bug in one change card can't
 * blank the whole panel. The baseline itself lives in storage, never in this
 * component, so a UI crash is always recoverable by reopening the plugin.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Handofflog UI error:", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: undefined });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="hl-scroll" role="alert">
          <div className="hl-banner">
            <p>
              <strong>Beklenmeyen bir hata oluştu.</strong>
            </p>
            <p>{this.state.error.message}</p>
          </div>
          <button className="hl-primary" onClick={this.reset}>
            Tekrar dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
