import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./popup.css";

const root = document.getElementById("root");
if (!root) throw new Error("Receivd popup root was not found.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
