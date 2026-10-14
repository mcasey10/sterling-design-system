import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "sterling-ui/styles.css";
import "sterling-ui/fonts.css";
import "./app.css";
import { App } from "./App";

document.body.classList.add("stl-text-body");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
