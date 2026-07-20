import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./styles/TypographyRefresh.css";
import "./styles/ColorfulTheme.css";
import "./styles/LinearTheme.css";
import "./styles/WorkspaceHomeTheme.css";
import "./styles/ProfessionalNeutralTheme.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
