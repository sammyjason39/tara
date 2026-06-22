import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createLeaveRequestSchema, type CreateLeaveRequestInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function CreateLeaveRequestModal({
  isOpen,
  onClose,
  employees = [],
  defaultEmployeeId = "",
  onSuccess,
}: CreateLeaveRequestModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateLeaveRequestInput, unknown>(
    "/v1/hr/leave-requests",
    "POST",
    ["/v1/hr/leave-requests"]
  );

  const handleSubmit = async (data: CreateLeaveRequestInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Leave request submitted", description: "Your leave request has been submitted for approval." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createLeaveRequestSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        type: "annual",
        startDate: "",
        endDate: "",
        reason: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Submit Leave Request"
      isOpen={isOpen}
      description="Create a new leave request for an employee."
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl><Textarea placeholder="Reason for leave" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
