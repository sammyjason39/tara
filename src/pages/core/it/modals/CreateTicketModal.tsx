import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import {
  createTicketSchema,
  type CreateTicketInput,
  TICKET_CATEGORIES,
  IMPACT_LEVELS,
  assignPriority,
} from "../schemas";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketModalProps) {
  const { toast } = useToast();
  const [computedPriority, setComputedPriority] = useState<string>("");

  const mutation = useModuleMutation<CreateTicketInput, unknown>(
    "/v1/it/tickets",
    "POST",
    ["/v1/it/tickets"]
  );

  const handleSubmit = async (data: CreateTicketInput) => {
    const priority = assignPriority(data.category, data.impact);
    await mutation.mutateAsync({ ...data, priority } as any);
    toast({
      title: "Ticket created",
      description: `Support ticket "${data.title}" created with ${priority} priority.`,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createTicketSchema}
      defaultValues={{
        title: "",
        description: "",
        category: "software",
        impact: "MEDIUM",
        assigneeId: "",
        reporterId: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Support Ticket"
      isOpen={isOpen}
      description="Submit a new IT support request. Priority is assigned automatically based on category and impact."
    >
      {(form) => {
        const watchCategory = form.watch("category");
        const watchImpact = form.watch("impact");

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (watchCategory && watchImpact) {
            setComputedPriority(assignPriority(watchCategory, watchImpact));
          }
        }, [watchCategory, watchImpact]);

        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the problem..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TICKET_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IMPACT_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {computedPriority && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Assigned Priority:
                </span>
                <Badge
                  variant="outline"
                  className={
                    computedPriority === "Critical"
                      ? "border-destructive text-destructive"
                      : computedPriority === "High"
                        ? "border-warning text-warning"
                        : computedPriority === "Medium"
                          ? "border-warning text-warning"
                          : "border-muted-foreground text-muted-foreground"
                  }
                >
                  {computedPriority}
                </Badge>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <Input placeholder="Assignee ID (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reporterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporter</FormLabel>
                    <FormControl>
                      <Input placeholder="Reporter ID (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      }}
    </ModuleModal>
  );
}
