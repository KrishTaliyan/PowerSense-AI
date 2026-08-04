import { Component } from "react";
import Icon from "./Icon.jsx";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong." };
  }

  componentDidCatch(error, info) {
    // Surfaced in the console so it's still debuggable during development.
    console.error("PowerSense crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="state-card panel">
          <span className="state-icon"><Icon name="alert" size={22} /></span>
          <strong>The app hit an unexpected error</strong>
          <span>{this.state.message}</span>
          <button className="action-button button-primary" onClick={this.handleReload} type="button" style={{ marginTop: 8 }}>
            Reload PowerSense
          </button>
        </div>
      </div>
    );
  }
}