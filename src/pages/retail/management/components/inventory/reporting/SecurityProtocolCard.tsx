import React from "react";
import { Badge } from "@/components/ui/badge";
import { Settings2, Info } from "lucide-react";

export const SecurityProtocolCard: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto pt-8">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
        <div className="relative rounded-2xl bg-background p-6 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Settings2 className="w-48 h-48 text-foreground" />
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-secondary/40 border border-border flex items-center justify-center shrink-0 shadow-inner">
              <Info className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-5 text-center lg:text-left flex-1">
              <h4 className="font-black italic text-2xl uppercase tracking-tighter text-foreground">
                Enterprise Data Compliance Standard
              </h4>
              <p className="text-base text-muted-foreground/90 font-medium leading-relaxed italic max-w-3xl">
                Analytical extractions are governed by our decentralized
                multi-tenant isolation protocols. Every deployment is
                cryptographically logged and benchmarked against departmental
                audit requirements.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 justify-center lg:justify-start">
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground rounded-xl font-black italic uppercase text-[11px] px-4 py-1"
                >
                  ISO-27001 ISOLATED
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground rounded-xl font-black italic uppercase text-[11px] px-4 py-1"
                >
                  REAL-TIME TELEMETRY
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground rounded-xl font-black italic uppercase text-[11px] px-4 py-1"
                >
                  ENCRYPTED EXPORT
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
