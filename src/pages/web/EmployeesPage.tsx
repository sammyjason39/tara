import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Search, Plus, Filter, MoreHorizontal, Building2, X, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/contexts/BrandingContext";

export function EmployeesPage() {
  const { t } = useTranslation();
  const { companyName } = useBranding();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editEmp, setEditEmp] = useState<any | null>(null);
  const [editSupervisorId, setEditSupervisorId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const navigate = useNavigate();
  const filterRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get("/employees"),
    placeholderData: { data: [] },
  });

  const allEmployees = data?.data || [];

  const employees = allEmployees.filter((emp: any) => {
    const matchesSearch = search.trim() === "" || [
      emp.full_name,
      emp.email,
      emp.employee_code,
    ].some((field) => field?.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

  const departments = [...new Set(allEmployees.map((e: any) => e.department).filter(Boolean))] as string[];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [newEmp, setNewEmp] = useState({ full_name: "", email: "", department: "", role: "", supervisor_id: "" });

  const handleAddEmployee = async () => {
    if (!newEmp.full_name || !newEmp.email) {
      toast.error(t("employees.name_email_required"));
      return;
    }
    try {
      await api.post("/employees", {
        ...newEmp,
        supervisor_id: newEmp.supervisor_id || null,
      });
      toast.success(t("employees.added_success"));
      setShowAddPanel(false);
      setNewEmp({ full_name: "", email: "", department: "", role: "", supervisor_id: "" });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err.message || t("employees.add_failed"));
    }
  };

  const openEditModal = (emp: any) => {
    setEditEmp(emp);
    setEditSupervisorId(emp.supervisor_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editEmp) return;
    setEditSaving(true);
    try {
      await api.put(`/employees/${editEmp.id}`, {
        supervisor_id: editSupervisorId || null,
      });
      toast.success("Atasan berhasil diperbarui");
      setEditEmp(null);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui atasan");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">{t("employees.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data karyawan {companyName}
          </p>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("employees.add_employee")}
        </button>
      </div>

      {/* Add Employee Panel */}
      {showAddPanel && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("employees.add_new_employee")}</h3>
            <button onClick={() => setShowAddPanel(false)} className="p-1 rounded hover:bg-accent">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder={t("employees.full_name_required")}
              value={newEmp.full_name}
              onChange={(e) => setNewEmp({ ...newEmp, full_name: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <input
              type="email"
              placeholder={t("employees.email_required")}
              value={newEmp.email}
              onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <input
              type="text"
              placeholder={t("employees.department")}
              value={newEmp.department}
              onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <input
              type="text"
              placeholder={t("employees.position")}
              value={newEmp.role}
              onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <select
              value={newEmp.supervisor_id}
              onChange={(e) => setNewEmp({ ...newEmp, supervisor_id: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 md:col-span-2"
            >
              <option value="">— Atasan / Approver cuti (opsional) —</option>
              {allEmployees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} {emp.department ? `· ${emp.department}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddPanel(false)}
              className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("employees.search_placeholder")}
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-md border border-input text-sm hover:bg-accent transition-colors",
              departmentFilter !== "all" && "border-gold text-gold"
            )}
          >
            <Filter className="h-4 w-4" />
            {departmentFilter === "all" ? t("common.filter") : departmentFilter}
          </button>
          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-1 w-48 rounded-md border border-border bg-card shadow-luxury-lg py-1 z-50 animate-fade-in">
              <button
                onClick={() => { setDepartmentFilter("all"); setShowFilterDropdown(false); }}
                className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors", departmentFilter === "all" && "font-medium text-gold")}
              >
                {t("employees.all_departments")}
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => { setDepartmentFilter(dept); setShowFilterDropdown(false); }}
                  className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors", departmentFilter === dept && "font-medium text-gold")}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="surface-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-luxury-label">{t("employees.employee_table_header")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden md:table-cell">{t("employees.department_table_header")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden lg:table-cell">{t("employees.position_table_header")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden xl:table-cell">Atasan</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden lg:table-cell">{t("employees.status_table_header")}</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-48 bg-muted/60 rounded animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-4 hidden xl:table-cell"><div className="h-3.5 w-24 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-4 hidden lg:table-cell"><div className="h-5 w-14 bg-muted rounded-full animate-pulse" /></td>
                  <td className="px-4 py-4"></td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("employees.no_data")}</p>
                </td>
              </tr>
            ) : (
              employees.map((emp: any) => (
                <tr
                  key={emp.id}
                  onClick={() => navigate(`/web/employees/${emp.id}`)}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gold">
                          {emp.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {emp.department || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                    {emp.role || "Employee"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                    {emp.supervisor_name || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
                      emp.employment_status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {emp.employment_status === "active" ? t("common.active") : emp.employment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" ref={openMenuId === emp.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === emp.id ? null : emp.id); }}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {openMenuId === emp.id && (
                        <div className="absolute top-full right-0 mt-1 w-40 rounded-md border border-border bg-card shadow-luxury-lg py-1 z-50 animate-fade-in">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/web/employees/${emp.id}`); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          >
                            {t("employees.view_profile")}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); openEditModal(emp); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          >
                            Ubah Atasan
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); toast(t("employees.deactivated")); }}
                            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                          >
                            {t("employees.deactivate")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Supervisor Modal */}
      {editEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditEmp(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 space-y-4 shadow-luxury-lg animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-semibold">Atur Atasan / Approver</h3>
              </div>
              <button onClick={() => setEditEmp(null)} className="p-1 rounded hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="text-sm">
              <p className="font-medium">{editEmp.full_name}</p>
              <p className="text-xs text-muted-foreground">{editEmp.department || "—"} · {editEmp.role || "Employee"}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Atasan untuk approval cuti
              </label>
              <select
                value={editSupervisorId}
                onChange={(e) => setEditSupervisorId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">— Tanpa atasan —</option>
                {allEmployees
                  .filter((emp: any) => emp.id !== editEmp.id)
                  .map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.department ? `· ${emp.department}` : ""}
                    </option>
                  ))}
              </select>
              <p className="text-2xs text-muted-foreground">
                Atasan ini akan menerima notifikasi WhatsApp dan menyetujui pengajuan cuti karyawan.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditEmp(null)}
                className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              >
                {editSaving ? "Menyimpan..." : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
