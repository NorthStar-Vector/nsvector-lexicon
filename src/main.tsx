import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LexiConApp } from "./lexicon/LexiConApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LexiConApp />
  </StrictMode>,
);
