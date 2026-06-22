import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { captureLeadSchema, type CaptureLeadInput } from "../schemas";
import { toast } from "sonner";

interface CaptureLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function CaptureLeadModal({
  isOpen,
  onClose,
  campaigns = [],
  onSuccess,
}: CaptureLeadModalProps) {
  const mutation = useModuleMutation<CaptureLeadInput, unknown>(
    "/v1/marketing/leads",
    "POST",
    ["/v1/marketing/leads"]
  );

  const handleSubmit = async (data: CaptureLeadInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Lead captured", {
        description: `${data.companyName} has been ingested and scored.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to capture lead", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={captureLeadSchema}
      defaultValues={{
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        source: "LANDING_PAGE",
        campaignId: "",
        industry: "",
        employeeBand: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Capture Lead"
      isOpen={isOpen}
      description="Manually ingest a new lead entity for scoring and nurturing."
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl><Input placeholder="ACME Inc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
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
                <FormControl><Input placeholder="+1 555-0100" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LANDING_PAGE">Landing Page</SelectItem>
                      <SelectItem value="EMBEDDED_FORM">Embedded Form</SelectItem>
                      <SelectItem value="CHATBOT">Chatbot</SelectItem>
                      <SelectItem value="WEBINAR">Webinar</SelectItem>
                      <SelectItem value="META_LEAD_ADS">Meta Lead Ads</SelectItem>
                      <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                      <SelectItem value="PARTNER_API">Partner API</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No campaign</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeBand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Band</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-1000">201-1000</SelectItem>
                      <SelectItem value="1000+">1000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </ModuleModal>
  );
}
