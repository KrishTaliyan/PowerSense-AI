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
    const card = (
      <div className="state-card">
        <span className="state-icon"><Icon name="alert" size={22} /></span>
        <strong>{this.props.page ? "This view hit an unexpected error" : "PowerSense hit an unexpected error"}</strong>
        <span>{this.state.message}</span>
        <button className="action-button button-primary" onClick={this.handleReload} type="button">Reload PowerSense</button>
      </div>
    );
    return this.props.page ? <div className="panel page-state-panel">{card}</div> : <div className="fatal-error">{card}</div>;
  }
}
