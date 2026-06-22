import React, { useState, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  User,
  Database,
  Globe,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import { hrService } from "@/core/services/hr/hrService";
import type { RetailStore, RetailStoreType } from "@/core/types/retail/retail";
import { COUNTRIES, getCountry } from "@/lib/countries";

interface RegisterStoreDialogProps {
  onSuccess: (store: RetailStore) => void;
  trigger?: React.ReactNode;
}

export const RegisterStoreDialog: React.FC<RegisterStoreDialogProps> = ({
  onSuccess,
  trigger,
}) => {
  const session = useSession();
  const isAdmin = ["OWNER", "SUPERADMIN", "ADMIN"].includes(session.role || "");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; code: string; address: string }>
  >([]);
  const [pools, setPools] = useState<Array<{ id: string; name: string }>>([]);
  const [managers, setManagers] = useState<
    Array<{ id: string; fullName: string }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [useOfficeAddress, setUseOfficeAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const selectedCountry = getCountry(selectedCountryCode);

  const loadFormData = React.useCallback(async () => {
    setIsLoadingData(true);
    try {
      const tenantId = session.tenant_id;
      if (!tenantId) return;

      const [locs, plsz, mgrs] = await Promise.all([
        hrService.listLocations(tenantId, session),
        retailService.listInventoryPools(tenantId, session),
        hrService.listEmployees(tenantId, session),
      ]);
      setLocations(locs || []);
      setPools(plsz || []);
      setManagers(mgrs || []);
    } catch (err) {
      console.error("Failed to load dialog data", err);
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
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const type = formData.get("type") as RetailStoreType;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const managerId = formData.get("managerId") as string;
    const inventoryPoolId = formData.get("inventoryPoolId") as string;
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : undefined;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : undefined;
    const geofenceRadius = formData.get("geofence_radius") ? parseFloat(formData.get("geofence_radius") as string) : 200;

    if (!name || !code || !selectedLocationId) {
      toast({
        title: "Validation Error",
        description: "Name, Code, and Location are required.",
        variant: "destructive",
      });
      return;
    }

    let finalAddress = manualAddress;
    if (useOfficeAddress) {
      const selectedLoc = locations.find((l) => l.id === selectedLocationId);
      finalAddress = selectedLoc?.address || "";
    }

    setIsRegistering(true);
    try {
      const payload = {
        name,
        code,
        locationId: selectedLocationId,
        type,
        address: finalAddress,
        phone,
        email,
        managerId: managerId || undefined,
        inventoryPoolId: inventoryPoolId || undefined,
        latitude,
        longitude,
        geofenceRadius,
        country: selectedCountryCode || undefined,
        currency: selectedCountry?.currency || undefined,
        timezone: "Asia/Jakarta", // Defaulting for ID, could be made dynamic
      };

      const created = await retailService.createStore(
        session.tenant_id!,
        session,
        payload as Partial<RetailStore>,
      );

      toast({
        title: "Success",
        description: "Branch established successfully.",
      });
      onSuccess(created);
      setOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Registration failed.",
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
            variant="ghost"
            size="sm"
            className="h-8 text-primary font-black italic gap-1"
          >
            <Plus className="w-4 h-4" /> Register New
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-[2rem] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black italic text-2xl uppercase tracking-tighter text-primary">
            Establishing New Branch
          </DialogTitle>
          <DialogDescription className="font-bold italic">
            Assign unique code and identifiers for the new physical store.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Store Name
                </Label>
                <input
                  type="text"
                  name="name"
                  required
                  className="flex h-12 w-full rounded-xl border border-border bg-white px-3 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Jakarta South Plaza"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Unique Code
                </Label>
                <input
                  type="text"
                  name="code"
                  required
                  className="flex h-12 w-full rounded-xl border border-border bg-white px-3 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. JK-002"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Store Type
                </Label>
                <select
                  name="type"
                  defaultValue="flagship"
                  className="w-full h-12 rounded-xl border border-border px-3 font-bold italic text-sm bg-white"
                >
                  <option value="flagship">Flagship</option>
                  <option value="express">Express</option>
                  <option value="kiosk">Kiosk</option>
                  <option value="pop-up">Pop-Up</option>
                  <option value="warehouse">Warehouse</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Primary Contact (Phone)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    name="phone"
                    className="flex h-12 w-full rounded-xl border border-border bg-white pl-10 pr-3 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+62 21..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Contact Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    className="flex h-12 w-full rounded-xl border border-border bg-white pl-10 pr-3 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="branch@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Operational & Location */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location Assignment
                </Label>
                <select
                  required
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border px-3 font-bold italic text-sm bg-white"
                >
                  <option value="" disabled>
                    Select HR Location...
                  </option>
                  <option
                    value="placeholder"
                    className="text-primary font-black"
                  >
                    + Create New Physical Location
                  </option>
                  <hr className="my-1" />
                  {(Array.isArray(locations) ? locations : []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                  {locations.length === 0 && (
                    <option disabled>No locations found</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 pb-1">
                  <Checkbox
                    id="office-address"
                    checked={useOfficeAddress}
                    onCheckedChange={(checked) =>
                      setUseOfficeAddress(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="office-address"
                    className="text-[10px] font-black uppercase tracking-widest text-primary cursor-pointer"
                  >
                    Same as Office Address
                  </Label>
                </div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Physical Address
                </Label>
                <textarea
                  value={
                    useOfficeAddress
                      ? locations.find((l) => l.id === selectedLocationId)
                          ?.address || "No address on file"
                      : manualAddress
                  }
                  onChange={(e) => setManualAddress(e.target.value)}
                  disabled={useOfficeAddress}
                  className="flex min-h-[80px] w-full rounded-xl border border-border bg-white px-3 py-2 font-bold italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Street, City, Building..."
                />
              </div>

              {/* Geospatial Section */}
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> Geospatial Anchoring
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Latitude</Label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      placeholder="0.0000"
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-2 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Longitude</Label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      placeholder="0.0000"
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-2 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Geofence Radius (m)</Label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    name="geofence_radius"
                    defaultValue="200"
                    className="w-full h-1.5 bg-primary rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Regulatory Region (Optional)
                </Label>
                <select
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border px-3 font-bold italic text-sm bg-white"
                >
                  <option value="">Inherit from Head Office</option>
                  {(Array.isArray(COUNTRIES) ? COUNTRIES : []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>

                {selectedCountry && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary bg-primary/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Currency:
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {selectedCountry.currency}
                    </span>
                    <span className="text-[10px] font-medium text-primary/70">
                      ({selectedCountry.symbol})
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> Branch Manager
                </Label>
                <select
                  name="managerId"
                  className="w-full h-12 rounded-xl border border-border px-3 font-bold italic text-sm bg-white"
                >
                  <option value="">(None assigned)</option>
                  {(Array.isArray(managers) ? managers : []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Database className="w-3 h-3" /> Inventory Pool
                </Label>
                <select
                  name="inventoryPoolId"
                  className="w-full h-12 rounded-xl border border-border px-3 font-bold italic text-sm bg-white"
                >
                  <option value="">Private (Self-managed)</option>
                  {(Array.isArray(pools) ? pools : []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="submit"
              className="w-full h-14 bg-primary hover:bg-primary text-foreground font-black italic rounded-xl shadow-xl uppercase tracking-widest"
              disabled={isRegistering || isLoadingData}
            >
              {isRegistering ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isAdmin ? (
                "Establish Branch"
              ) : (
                "Request Authorization"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
