import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerDefaultRepos } from "@/core/persistence/repositoryRegistry";

registerDefaultRepos();

createRoot(document.getElementById("root")!).render(<App />);
