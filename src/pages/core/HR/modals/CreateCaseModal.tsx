import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createCaseSchema, type CreateCaseInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function CreateCaseModal({
  isOpen,
  onClose,
  employees = [],
  defaultEmployeeId = "",
  onSuccess,
}: CreateCaseModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateCaseInput, unknown>(
    "/v1/hr/cases",
    "POST",
    ["/v1/hr/cases"]
  );

  const handleSubmit = async (data: CreateCaseInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Case created", description: `Case "${data.title}" has been opened.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createCaseSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        title: "",
        category: "inquiry",
        description: "",
        priority: "medium",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Case"
      isOpen={isOpen}
      description="Open a new HR case (grievance, disciplinary, complaint, or inquiry)."
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input placeholder="Case title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="grievance">Grievance</SelectItem>
                      <SelectItem value="disciplinary">Disciplinary</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Textarea placeholder="Describe the case details" rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
