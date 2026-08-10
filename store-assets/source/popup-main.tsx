import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/popup/App";
import "../../src/popup/popup.css";
import { previewStorage } from "./demoData";
import { installMockChrome } from "./mockChrome";
import "./showcase.css";

const storage = previewStorage();
installMockChrome(storage.local, storage.sync);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
