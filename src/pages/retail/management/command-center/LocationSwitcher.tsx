import React from "react";
import { Building2, MapPin, Globe } from "lucide-react";
import { useRetail } from "../../context/RetailContext";

interface LocationSwitcherProps {
  currentLocationId?: string;
  onLocationChange: (locationId?: string) => void;
}

export const LocationSwitcher: React.FC<LocationSwitcherProps> = ({
  currentLocationId,
  onLocationChange,
}) => {
  const { stores } = useRetail();

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-500/5 backdrop-blur-md rounded-2xl border border-slate-200/50 overflow-x-auto max-w-full no-scrollbar">
      <button
        onClick={() => onLocationChange(undefined)}
        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
          !currentLocationId
            ? "bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-slate-900 border border-slate-100"
            : "text-slate-400 hover:text-slate-600 border border-transparent"
        }`}
      >
        <Globe className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Global Root</span>
      </button>

      {(Array.isArray(stores) ? stores : []).map((store) => (
        <button
          key={store.id}
          onClick={() => onLocationChange(store.id)}
          className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
            currentLocationId === store.id
              ? "bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-slate-900 border border-slate-100"
              : "text-slate-400 hover:text-slate-600 border border-transparent"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />{" "}
          <span className="hidden sm:inline">{store.name}</span>
        </button>
      ))}
    </div>
  );
};
