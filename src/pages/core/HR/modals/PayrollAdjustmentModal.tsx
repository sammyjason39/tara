import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { payrollAdjustmentSchema, type PayrollAdjustmentInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface PayrollAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function PayrollAdjustmentModal({
  isOpen,
  onClose,
  employees = [],
  defaultEmployeeId = "",
  onSuccess,
}: PayrollAdjustmentModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<PayrollAdjustmentInput, unknown>(
    "/v1/hr/payroll/adjustments",
    "POST",
    ["/v1/hr/payroll/runs", "/v1/hr/payroll/adjustments"]
  );

  const handleSubmit = async (data: PayrollAdjustmentInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Payroll adjustment saved", description: "The payroll adjustment has been recorded." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={payrollAdjustmentSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        period: "",
        baseSalary: 0,
        allowances: 0,
        deductions: 0,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Payroll Adjustment"
      isOpen={isOpen}
      description="Record salary adjustments, allowances, and deductions."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period *</FormLabel>
                <FormControl><Input placeholder="e.g. 2026-02" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Salary *</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowances"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowances</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deductions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deductions</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Adjustment notes" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
