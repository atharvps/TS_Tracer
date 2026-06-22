import React from "react";
import { createRoot } from "react-dom/client";
import { SidePanel } from "@components/SidePanel.tsx";
import "./sidepanel.css";

const container = document.getElementById("root")!;
createRoot(container).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);
