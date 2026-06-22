import React from "react";
import { Package, Hash, Plus } from "lucide-react";
import { RetailProduct } from "@/core/types/retail/retail";
import { GlassCard } from "@/components/shared/GlassCard";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

interface ProductGridProps {
  products: RetailProduct[];
  onAddToCart: (product: RetailProduct) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      {(Array.isArray(products) ? products : []).map((p) => (
        <GlassCard
          key={p.id}
          className="group cursor-pointer border-2 border-border backdrop-blur-xl bg-card/40 hover:bg-accent/40 hover:border-primary hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15)] hover:-translate-y-1.5 transition-all duration-500 active:scale-95 overflow-hidden rounded-[2rem] relative"
          onClick={() => onAddToCart(p)}
        >
          <div className="aspect-square bg-secondary/20 flex items-center justify-center p-10 group-hover:bg-primary/10 transition-colors relative overflow-hidden">
            <Package className="w-12 h-12 text-muted-foreground/40 group-hover:text-primary/60 transition-all duration-500 group-hover:scale-110" />

            <div className="absolute top-5 right-5 p-2.5 bg-card rounded-xl shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <Plus className="w-4 h-4 text-primary" />
            </div>

            <div className="absolute bottom-5 left-5">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 bg-card/90 backdrop-blur-sm rounded-lg text-muted-foreground border border-border/50 shadow-sm leading-none">
                {p.categoryName || "GLOBAL"}
              </span>
            </div>

            {/* Hover Decor */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug tracking-tight">
                {p.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Hash className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter font-mono">
                  {p.sku}
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between mt-auto gap-2">
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest italic leading-none mb-1">
                  Value
                </span>
                <span className="text-lg font-black text-foreground italic leading-none truncate">
                  {formatCurrency(p.price, "IDR", "id-ID")}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] font-black uppercase py-0.5 px-2.5 border-border text-muted-foreground bg-secondary/5 shrink-0"
              >
                {p.stock}
              </Badge>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
