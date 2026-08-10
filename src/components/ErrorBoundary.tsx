import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /**
   * When this value changes, a caught error is cleared. Pass the current route
   * so navigating away from a broken page recovers instead of staying stuck —
   * React error boundaries never reset themselves.
   */
  resetKey?: string;
  /** Softer wording for a section of a page rather than the whole site. */
  variant?: "page" | "section";
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * Catches render-time errors so one bad article or malformed field can't take
 * the whole newspaper down.
 *
 * Readers see plain language and a way out; the technical detail is behind a
 * toggle (and expanded automatically during development) so it's still
 * one click away when debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: import.meta.env.DEV };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError || !this.state.error) return this.props.children;

    const isSection = this.props.variant === "section";

    return (
      <div
        role="alert"
        className={
          isSection
            ? "my-6 rounded-lg border border-border bg-muted/30 p-6 text-center"
            : "mx-auto my-16 max-w-xl rounded-lg border border-border bg-muted/30 p-8 text-center"
        }
      >
        <h2 className="font-serif text-xl font-bold text-foreground">
          {isSection ? "This section didn’t load" : "This page didn’t load"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Something went wrong on our end — it isn’t anything you did. The rest of
          the site is still working.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          {!isSection && (
            <a
              href="/"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Go to the front page
            </a>
          )}
          <button
            type="button"
            onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
            className="px-2 py-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {this.state.showDetails ? "Hide details" : "Technical details"}
          </button>
        </div>

        {this.state.showDetails && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-border bg-background p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
