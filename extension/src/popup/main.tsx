import React from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "@components/Popup.tsx";
import "./popup.css";

const container = document.getElementById("root")!;
createRoot(container).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
