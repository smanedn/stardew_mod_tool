import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { errorMessage: null };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error.message || 'An unexpected UI error occurred.' };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught UI error:', error, info.componentStack);
  }

  public override render(): ReactNode {
    if (this.state.errorMessage !== null) {
      return (
        <div className="module-card">
          <h3>Something went wrong in the editor</h3>
          <p className="field-error">{this.state.errorMessage}</p>
          <button
            type="button"
            className="launch-btn"
            onClick={() => {
              this.setState({ errorMessage: null });
            }}
          >
            Recover Editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
