import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { connectAccountSchema, type ConnectAccountInput } from "../schemas";
import { toast } from "sonner";

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConnectAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: ConnectAccountModalProps) {
  const mutation = useModuleMutation<{ provider: string; accountName: string; scopes: string[] }, unknown>(
    "/v1/marketing/accounts",
    "POST",
    ["/v1/marketing/accounts"]
  );

  const handleSubmit = async (data: ConnectAccountInput) => {
    try {
      await mutation.mutateAsync({
        provider: data.provider,
        accountName: data.accountName,
        scopes: data.scopes.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("Account connected", {
        description: `${data.provider} account "${data.accountName}" has been linked.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to connect account", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={connectAccountSchema}
      defaultValues={{
        provider: "META",
        accountName: "",
        scopes: "ads_read,leads_retrieval",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Connect Account"
      isOpen={isOpen}
      description="Link a cloud advertising platform via secure OAuth handshake."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="META">Meta</SelectItem>
                    <SelectItem value="GOOGLE">Google</SelectItem>
                    <SelectItem value="TIKTOK">TikTok</SelectItem>
                    <SelectItem value="YOUTUBE">YouTube</SelectItem>
                    <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name *</FormLabel>
                <FormControl><Input placeholder="My Business Account" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scopes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OAuth Scopes *</FormLabel>
                <FormControl><Input placeholder="ads_read,leads_retrieval,analytics" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
