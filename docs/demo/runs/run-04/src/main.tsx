import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "sterling-ui/styles.css";
import "sterling-ui/fonts.css";
import "./App.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
