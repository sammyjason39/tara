import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createEmployeeSchema, type CreateEmployeeInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: { id: string; name: string }[];
  locations?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function CreateEmployeeModal({
  isOpen,
  onClose,
  departments,
  locations = [],
  onSuccess,
}: CreateEmployeeModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateEmployeeInput, unknown>(
    "/v1/hr/employees",
    "POST",
    ["/v1/hr/employees"]
  );

  const handleSubmit = async (data: CreateEmployeeInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Employee created", description: `${data.firstName} ${data.lastName} has been added.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createEmployeeSchema}
      defaultValues={{
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        departmentId: "",
        locationId: "",
        roleTitle: "",
        status: "active",
        employmentType: "full_time",
        baseSalary: 0,
        hireDate: new Date().toISOString().slice(0, 10),
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Employee"
      isOpen={isOpen}
      description="Onboard a new employee to the directory."
    >
      {(form) => (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl><Input placeholder="First name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl><Input placeholder="Last name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl><Input type="email" placeholder="Email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roleTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Title *</FormLabel>
                <FormControl><Input placeholder="Role title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="candidate">Candidate</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Salary</FormLabel>
                <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Hire Date *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
