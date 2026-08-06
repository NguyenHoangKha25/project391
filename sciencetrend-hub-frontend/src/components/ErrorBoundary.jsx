import { Component } from "react";
import "../styles/ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application render error", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/dashboard";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-page">
        <section className="app-error-card" role="alert">
          <span>Something went wrong</span>
          <h1>This page could not be displayed.</h1>
          <p>Your account and saved data are unchanged. Reload the page to try again.</p>
          <div>
            <button type="button" onClick={this.handleReset}>
              Reload page
            </button>
            <button type="button" onClick={this.handleReset}>
              Return to dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
