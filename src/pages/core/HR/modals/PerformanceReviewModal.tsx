import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createPerformanceReviewSchema, type CreatePerformanceReviewInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface PerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function PerformanceReviewModal({
  isOpen,
  onClose,
  employees = [],
  defaultEmployeeId = "",
  onSuccess,
}: PerformanceReviewModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreatePerformanceReviewInput, unknown>(
    "/v1/hr/performance-reviews",
    "POST",
    ["/v1/hr/performance-reviews"]
  );

  const handleSubmit = async (data: CreatePerformanceReviewInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Review created", description: "Performance review has been initiated." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createPerformanceReviewSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        cycleId: "",
        score: undefined,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Performance Review"
      isOpen={isOpen}
      description="Start or record a performance review for an employee."
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
            name="cycleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review Cycle *</FormLabel>
                <FormControl><Input placeholder="e.g. Q1-2026" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Score (0-100)</FormLabel>
                <FormControl><Input type="number" min={0} max={100} placeholder="Optional" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Review notes and feedback" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
