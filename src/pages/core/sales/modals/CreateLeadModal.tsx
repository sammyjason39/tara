import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createLeadSchema, type CreateLeadInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateLeadInput, unknown>(
    "/v1/sales/leads",
    "POST",
    ["/v1/sales/leads", "/v1/sales/dashboard"]
  );

  const handleSubmit = async (data: CreateLeadInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Lead created", description: `${data.companyName} injected into registry.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createLeadSchema}
      defaultValues={{
        companyName: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        potentialValue: 0,
        source: "DIRECT",
        priority: "MEDIUM",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create New Lead"
      description="Register a new qualified prospect into the sales ecosystem."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl><Input placeholder="Global Dynamics Inc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl><Input placeholder="Sarah Connor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="sarah@global.example" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input placeholder="+62 812 3456 7890" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="potentialValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potential Value</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["DIRECT", "MARKETING", "REFERRAL", "INBOUND", "OUTBOUND", "PARTNER"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
