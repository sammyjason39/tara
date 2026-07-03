import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "./lib/i18n";
import { applyBrandingFonts, DEFAULT_FONTS } from "@/lib/google-fonts";

applyBrandingFonts(DEFAULT_FONTS);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
