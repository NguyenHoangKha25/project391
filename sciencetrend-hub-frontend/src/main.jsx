import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./styles/ProductTheme.css";
import "./styles/ResearchDesk.css";
import "./styles/ResearchCockpit.css";
import "./styles/ExperienceTheme.css";
import "./styles/ReleaseVisualLayer.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
