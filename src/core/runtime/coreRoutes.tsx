// ============================================================================
// CORE ROUTE BUILDER (PHASE 3)
// ============================================================================
//
// Purpose:
// - Build canonical Core routes from CorePageResolver
// - Core pages are always active
// - No licensing, no modules, no tenant conditions
//
// Core is administrative backbone.
//
// ============================================================================

import { Navigate, Route } from "react-router-dom";

import { resolveCorePages } from "./corePageResolver";
import ProtectedRoute from "@/core/security/ProtectedRoute";
import HRWorkspaceLayout from "@/pages/core/HR/HRWorkspaceLayout";
import PulseDesk from "@/pages/core/HR/PulseDesk";
import RosterGrid from "@/pages/core/HR/RosterGrid";
import PeopleCore from "@/pages/core/HR/PeopleCore";
import OrgMap from "@/pages/core/HR/OrgMap";
import VaultSpace from "@/pages/core/HR/VaultSpace";
import FlowGate from "@/pages/core/HR/FlowGate";
import TalentFlow from "@/pages/core/HR/TalentFlow";
import SkillTrack from "@/pages/core/HR/SkillTrack";
import GrowthCycle from "@/pages/core/HR/GrowthCycle";
import PayCycleStudio from "@/pages/core/HR/PayCycleStudio";
import LexBoard from "@/pages/core/HR/LexBoard";
import InsightLayer from "@/pages/core/HR/InsightLayer";
import CaseDesk from "@/pages/core/HR/Cases/CaseDesk";
import CaseDetail from "@/pages/core/HR/Cases/CaseDetail";
import FinanceWorkspaceLayout from "@/pages/core/Finance/FinanceWorkspaceLayout";
import MoneyDesk from "@/pages/core/Finance/MoneyDesk";
import TreasuryMap from "@/pages/core/Finance/TreasuryMap";
import WorkflowInbox from "@/pages/core/WorkflowInbox";
import ToolsHome from "@/pages/core/tools/ToolsHome";
import DocumentTool from "@/pages/core/tools/DocumentTool";
import SpreadsheetTool from "@/pages/core/tools/SpreadsheetTool";
import PresentationTool from "@/pages/core/tools/PresentationTool";
import CalculatorTool from "@/pages/core/tools/CalculatorTool";
import ExportTool from "@/pages/core/tools/ExportTool";
import Explorer from "@/pages/core/tools/Explorer";

/**
 * Build Core Routes.
 *
 * RULES:
 * - Always exists
 * - Always accessible (permissions handled elsewhere)
 * - Derived from resolver only
 */
export function buildCoreRoutes(): JSX.Element[] {
  const pages = resolveCorePages();
  const defaultPage = pages.find((page) => page.id === "dashboard") ?? pages[0];
  const defaultPath = defaultPage?.route.replace("/core/", "") ?? "";

  const routes = pages.map((page) => {
    const Component = page.component;
    return (
      <Route
        key={page.id}
        path={page.route.replace("/core/", "")}
        element={<Component />}
      />
    );
  });

  if (!defaultPath) {
    return routes;
  }

  return [
    <Route key="core-index" index element={<Navigate to={defaultPath} replace />} />,
    <Route
      key="core-finance"
      path="finance/*"
      element={
        <ProtectedRoute permission="core.finance.access" scope="COMPANY">
          <FinanceWorkspaceLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<MoneyDesk />} />
      <Route
        path="moneydesk"
        element={
          <ProtectedRoute permission="core.finance.access" scope="COMPANY">
            <MoneyDesk />
          </ProtectedRoute>
        }
      />
      <Route
        path="treasury"
        element={
          <ProtectedRoute permission="core.finance.treasury" scope="COMPANY">
            <TreasuryMap />
          </ProtectedRoute>
        }
      />
      {/* Remaining finance pages will be added in subsequent phases */}
    </Route>,
    <Route
      key="core-hr"
      path="hr/*"
      element={
        <ProtectedRoute permission="core.hr.access" scope="COMPANY">
          <HRWorkspaceLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<PulseDesk />} />
      <Route
        path="roster"
        element={
          <ProtectedRoute permission="hr.directory.view" scope="DEPARTMENT">
            <RosterGrid />
          </ProtectedRoute>
        }
      />
      <Route
        path="people/:id"
        element={
          <ProtectedRoute permission="hr.staff.view" scope="SELF">
            <PeopleCore />
          </ProtectedRoute>
        }
      />
      <Route
        path="org-map"
        element={
          <ProtectedRoute permission="hr.directory.view" scope="DEPARTMENT">
            <OrgMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="vault"
        element={
          <ProtectedRoute permission="core.hr.legal.manage" scope="COMPANY">
            <VaultSpace />
          </ProtectedRoute>
        }
      />
      <Route
        path="flowgate"
        element={
          <ProtectedRoute permission="hr.workspace.access" scope="COMPANY">
            <FlowGate />
          </ProtectedRoute>
        }
      />
      <Route
        path="cases"
        element={
          <ProtectedRoute permission="hr.workspace.access" scope="COMPANY">
            <CaseDesk />
          </ProtectedRoute>
        }
      />
      <Route
        path="cases/:id"
        element={
          <ProtectedRoute permission="hr.workspace.access" scope="COMPANY">
            <CaseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="talent"
        element={
          <ProtectedRoute permission="hr.recruitment.manage" scope="COMPANY">
            <TalentFlow />
          </ProtectedRoute>
        }
      />
      <Route
        path="skilltrack"
        element={
          <ProtectedRoute permission="hr.training.manage" scope="COMPANY">
            <SkillTrack />
          </ProtectedRoute>
        }
      />
      <Route
        path="growth"
        element={
          <ProtectedRoute permission="hr.performance.view" scope="COMPANY">
            <GrowthCycle />
          </ProtectedRoute>
        }
      />
      <Route
        path="paycycle"
        element={
          <ProtectedRoute permission="core.hr.payroll.view" scope="COMPANY">
            <PayCycleStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="lexboard"
        element={
          <ProtectedRoute permission="core.hr.legal.manage" scope="COMPANY">
            <LexBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="insights"
        element={
          <ProtectedRoute permission="core.hr.access" scope="COMPANY">
            <InsightLayer />
          </ProtectedRoute>
        }
      />
    </Route>,
    <Route
      key="core-workflow"
      path="workflow"
      element={
        <ProtectedRoute permission="hr.workspace.access" scope="COMPANY">
          <WorkflowInbox />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools"
      path="tools"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <ToolsHome />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-explorer"
      path="tools/explorer"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <Explorer />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-docs"
      path="tools/docs"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <DocumentTool />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-sheets"
      path="tools/sheets"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <SpreadsheetTool />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-slides"
      path="tools/slides"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <PresentationTool />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-calculators"
      path="tools/calculators"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <CalculatorTool />
        </ProtectedRoute>
      }
    />,
    <Route
      key="core-tools-exports"
      path="tools/exports"
      element={
        <ProtectedRoute permission="core.tools.access" scope="COMPANY">
          <ExportTool />
        </ProtectedRoute>
      }
    />,
    ...routes,
  ];
}
