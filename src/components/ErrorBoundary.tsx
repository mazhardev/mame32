import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary — used to retry a crashed game. */
  resetKey?: unknown;
  title?: string;
  onRetry?: () => void;
  fallbackActions?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a subtree (normally one game) so a crash never takes down the site.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private retry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty-state" role="alert">
        <div className="emoji">💥</div>
        <h3>{this.props.title ?? 'Game encountered an error'}</h3>
        <p className="small" style={{ marginTop: 8 }}>
          Something went wrong while running this game. Your saved data has not been affected.
        </p>
        {import.meta.env.DEV && (
          <pre
            className="mono tiny"
            style={{ marginTop: 12, textAlign: 'left', overflowX: 'auto', color: 'var(--danger)' }}
          >
            {this.state.error.message}
          </pre>
        )}
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={this.retry}>
            Restart Game
          </button>
          {this.props.fallbackActions}
        </div>
      </div>
    );
  }
}
