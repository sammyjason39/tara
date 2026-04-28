import * as React from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { canAccessWorkspace } from "@/core/security/policy";
import {
  Briefcase,
  FileText,
  GraduationCap,
  LayoutGrid,
  Users,
  Wallet,
  Inbox,
  ShieldCheck,
  Building2,
  LineChart,
} from "lucide-react";

type MenuItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const BASE_SECTIONS: MenuSection[] = [
  {
    title: "Dashboard",
    items: [
      {
        label: "PulseDesk",
        to: "/core/hr",
        icon: Inbox,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "People Directory",
        to: "/core/hr/roster",
        icon: Users,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Hiring",
    items: [
      {
        label: "Requisitions",
        to: "/core/hr/talent",
        icon: Briefcase,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        label: "Org Structure",
        to: "/core/hr/org-map",
        icon: Building2,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
      {
        label: "Staff Schedule",
        to: "/core/hr/schedule",
        icon: Briefcase,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Performance",
    items: [
      {
        label: "Review Cycles",
        to: "/core/hr/growth",
        icon: LayoutGrid,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
      {
        label: "SkillTrack",
        to: "/core/hr/skilltrack",
        icon: GraduationCap,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Payroll",
    items: [
      {
        label: "Payroll Runs",
        to: "/core/hr/paycycle",
        icon: Wallet,
        roles: ["HR_ADMIN", "FINANCE_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Compliance",
    items: [
      {
        label: "Contracts",
        to: "/core/hr/lexboard",
        icon: FileText,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
      {
        label: "Document Vault",
        to: "/core/hr/vault",
        icon: ShieldCheck,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
      {
        label: "Legal Cases",
        to: "/core/hr/cases",
        icon: LayoutGrid,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        label: "Workforce Insights",
        to: "/core/hr/insights",
        icon: LineChart,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Approvals",
    items: [
      {
        label: "Workflow Center",
        to: "/core/hr/flowgate",
        icon: Inbox,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN"],
      },
    ],
  },
  {
    title: "Employee Portal",
    items: [
      {
        label: "My Pulse",
        to: "/core/portal",
        icon: LayoutGrid,
        roles: ["HR_ADMIN", "COMPANY_ADMIN", "OWNER", "SUPERADMIN", "STAFF"],
      },
    ],
  },
];

export default function HRWorkspaceLayout() {
  const session = useSession();
  const location = useLocation();

  const sections: MenuSection[] = BASE_SECTIONS.map((section) => {
    if (section.title === "People" && session.user_id) {
      return {
        ...section,
        items: [
          ...section.items,
          {
            label: "PeopleCore",
            to: `/core/hr/people/${session.user_id}`,
            icon: LayoutGrid,
            roles: ["HR_ADMIN", "COMPANY_ADMIN", "DEPT_HEAD", "OWNER", "SUPERADMIN", "STAFF"],
          },
        ],
      };
    }
    return section;
  });

  const filterSections = sections.map((section) => {
    const items = section.items.filter((item) => item.roles.includes(session.role));
    return { ...section, items };
  }).filter((section) => section.items.length > 0);

  const rawSegments = location.pathname.replace("/core/hr", "").split("/").filter(Boolean);
  const breadcrumbItems = rawSegments.map((segment, index) => ({
    label: segment.replace(/-/g, " "),
    path: `/core/hr/${rawSegments.slice(0, index + 1).join("/")}`,
  }));

  if (!canAccessWorkspace(session, "HR")) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageShell
          header={<PageHeader title="Access denied" subtitle="HR workspace access is restricted." />}
        >
          <WorkspacePanel>
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Request access from your tenant administrator.
            </div>
          </WorkspacePanel>
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PageShell
        header={
          <div className="space-y-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core">Core</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/core/hr">HR</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={`${item.label}-${index}`}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbItems.length - 1 ? (
                        <BreadcrumbPage className="capitalize">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path} className="capitalize">
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <PageHeader
              title="Zenvix HR"
              subtitle="Enterprise HR operating system with workflow-native approvals."
            />
          </div>
        }
        left={
          <ScrollArea className="h-full max-h-[calc(100vh-120px)]">
            <div className="space-y-6 p-4">
              <WorkspacePanel>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">
                    Tenant: {session.tenant_id}
                  </p>
                  <p>Role: {session.role}</p>
                  <p>Department: {session.department_id}</p>
                </div>
              </WorkspacePanel>

              {filterSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/core/hr"}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        }
      >
        <Outlet />
      </PageShell>
    </div>
  );
}
