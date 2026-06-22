import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createCampaignSchema, type CreateCampaignInput } from "../schemas";
import { toast } from "sonner";

const CHANNELS = [
  { value: "META_ADS", label: "Meta Ads" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBINAR", label: "Webinar" },
  { value: "LANDING_PAGE", label: "Landing Page" },
  { value: "EVENT", label: "Event" },
] as const;

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCampaignModalProps) {
  const mutation = useModuleMutation<CreateCampaignInput, unknown>(
    "/v1/marketing/campaigns",
    "POST",
    ["/v1/marketing/campaigns"]
  );

  const handleSubmit = async (data: CreateCampaignInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Campaign created", {
        description: `"${data.name}" has been added to the campaign cluster.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to create campaign", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err; // Keep modal open on error
    }
  };

  return (
    <ModuleModal
      schema={createCampaignSchema}
      defaultValues={{
        name: "",
        objective: "LEAD_GENERATION",
        channelMix: ["META_ADS", "GOOGLE_ADS"],
        budget: 0,
        currency: "USD",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        audience: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Campaign"
      isOpen={isOpen}
      description="Define a new strategic marketing campaign with audience targeting and budget allocation."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Q4 Enterprise Expansion" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objective *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                    <SelectItem value="AWARENESS">Awareness</SelectItem>
                    <SelectItem value="NURTURE">Nurture</SelectItem>
                    <SelectItem value="REMARKETING">Remarketing</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="audience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audience Segments *</FormLabel>
                <FormControl><Input placeholder="e.g. SaaS Decision Makers, HR Leaders" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="channelMix"
            render={() => (
              <FormItem>
                <FormLabel>Channel Mix *</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map((channel) => (
                    <FormField
                      key={channel.value}
                      control={form.control}
                      name="channelMix"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(channel.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, channel.value]);
                                } else {
                                  field.onChange(current.filter((v: string) => v !== channel.value));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">{channel.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl><Input type="number" placeholder="50000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="IDR">IDR</SelectItem>
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
        </div>
      )}
    </ModuleModal>
  );
}
