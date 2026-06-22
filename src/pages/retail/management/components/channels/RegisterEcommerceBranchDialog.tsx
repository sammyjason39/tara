import React, { useState, useEffect } from "react";
import { Globe, RefreshCw, Store, PlusCircle, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import { hrService } from "@/core/services/hr/hrService";
import {
  ecommerceHubService,
  type RegisterEcommerceBranchResult,
} from "@/core/services/retail/ecommerceHubService";
import type { EcommercePlatform } from "@/core/types/retail/retail";

interface RegisterEcommerceBranchDialogProps {
  /** Called with the newly registered virtual branch after a successful registration. */
  onSuccess?: (branch: RegisterEcommerceBranchResult) => void;
  trigger?: React.ReactNode;
}

const PLATFORMS: Array<{ value: EcommercePlatform; label: string }> = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "tokopedia", label: "Tokopedia" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "custom", label: "Custom / Headless" },
];

/**
 * Unified entry point for registering e-commerce presence as a virtual branch.
 *
 * This dialog is the single "Register E-Commerce" action across the retail module. It
 * calls {@link ecommerceHubService.registerEcommerceBranch}, which creates a
 * `RetailStore` with `type: "ecommerce"` that participates in the branch hierarchy
 * (rather than a standalone entity that links TO branches). Loading state and
 * success/error feedback are surfaced to the user.
 */
export const RegisterEcommerceBranchDialog: React.FC<
  RegisterEcommerceBranchDialogProps
> = ({ onSuccess, trigger }) => {
  const session = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [bindChannel, setBindChannel] = useState(true);

  const loadFormData = React.useCallback(async () => {
    if (!session.tenant_id) return;
    setIsLoadingData(true);
    try {
      const locs = await hrService.listLocations(session.tenant_id, session);
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      console.error("Failed to load locations", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    if (open && session.tenant_id) {
      loadFormData();
    }
  }, [open, session.tenant_id, loadFormData]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session.tenant_id) return;

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const platform = formData.get("platform") as string;
    const domain = (formData.get("domain") as string)?.trim();
    const code = (formData.get("code") as string)?.trim();

    if (!name || !platform || !domain || !selectedLocationId) {
      toast({
        title: "Validation Error",
        description:
          "Name, platform, domain, and anchor location are required to register an e-commerce branch.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const branch = await ecommerceHubService.registerEcommerceBranch(
        session,
        {
          name,
          platform,
          domain,
          locationId: selectedLocationId,
          code: code || undefined,
          channel: bindChannel
            ? {
                name: `${name} Channel`,
                type: "OWNED",
                integrationCategory: "PREMADE",
              }
            : undefined,
        },
      );

      toast({
        title: "E-Commerce Branch Registered",
        description: `${name} is now a virtual branch in the hierarchy.`,
      });
      onSuccess?.(branch);
      setOpen(false);
      setSelectedLocationId("");
    } catch (err) {
      toast({
        title: "Registration Failed",
        description:
          "The system could not register the e-commerce branch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            className="h-10 px-6 rounded-2xl bg-primary text-foreground font-black italic uppercase tracking-widest text-[10px] gap-2 shadow-lg"
            data-testid="register-ecommerce-trigger"
          >
            <Globe className="w-4 h-4" /> Register E-Commerce
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-border/50 bg-white shadow-2xl max-w-lg p-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success via-primary to-chart-5" />

        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-xl text-success">
              <Globe className="w-5 h-5" />
            </div>
            <DialogTitle className="font-black italic text-2xl uppercase tracking-tighter text-muted-foreground">
              Register E-Commerce Branch
            </DialogTitle>
          </div>
          <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
            Add an e-commerce presence as a virtual branch inside the store
            hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRegister} className="px-8 pb-2 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
              Storefront Name
            </Label>
            <input
              type="text"
              name="name"
              required
              autoFocus
              className="flex h-12 w-full rounded-2xl border border-border bg-secondary/5 px-4 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all"
              placeholder="e.g. Online Flagship Store"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
                Platform
              </Label>
              <select
                name="platform"
                defaultValue="shopify"
                className="w-full h-12 rounded-2xl border border-border bg-secondary/5 px-4 font-bold italic text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all appearance-none cursor-pointer"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
                Branch Code
              </Label>
              <input
                type="text"
                name="code"
                className="flex h-12 w-full rounded-2xl border border-border bg-secondary/5 px-4 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all"
                placeholder="auto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
              Storefront Domain
            </Label>
            <input
              type="text"
              name="domain"
              required
              className="flex h-12 w-full rounded-2xl border border-border bg-secondary/5 px-4 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all"
              placeholder="e.g. shop.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Anchor Location (Hierarchy
              Parent)
            </Label>
            <select
              required
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full h-12 rounded-2xl border border-border bg-secondary/5 px-4 font-bold italic text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>
                Select anchor location...
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} [{loc.code}]
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pl-1">
            <input
              type="checkbox"
              checked={bindChannel}
              onChange={(e) => setBindChannel(e.target.checked)}
              className="w-4 h-4 rounded accent-success"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Bind a sales channel to this
              branch
            </span>
          </label>

          <DialogFooter className="pt-2 pb-8">
            <div className="flex w-full gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 h-13 rounded-2xl border-border font-black italic uppercase tracking-widest text-[10px] py-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRegistering || isLoadingData}
                className="flex-[2] h-13 bg-success hover:bg-success/90 text-white font-black italic rounded-2xl uppercase tracking-[0.2em] text-[10px] py-4 group transition-all active:scale-95"
              >
                {isRegistering ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    Register Virtual Branch
                    <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  </div>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
