export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const navigation = [
  { id: "Dashboard", label: "Overview", icon: "grid" },
  { id: "Map", label: "Network map", icon: "map" },
  { id: "Tickets", label: "Incidents", icon: "alert" },
  { id: "Telemetry", label: "Live signals", icon: "pulse" },
  { id: "Simulation", label: "Practice lab", icon: "flask" },
];

export const stageOrder = ["detected", "acknowledged", "crew_assigned", "resolved", "verified"];
