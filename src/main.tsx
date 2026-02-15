import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerDefaultRepos } from "@/core/persistence/repositoryRegistry";
import { registerIndustryModules } from "@/modules/moduleBundle";
import { startFinanceBackgroundScheduler } from "@/core/services/finance/financeScheduler";

registerDefaultRepos();
registerIndustryModules();
startFinanceBackgroundScheduler();

createRoot(document.getElementById("root")!).render(<App />);
