import React from "react";
import { Printer, Settings2 } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrintItem } from "../PostekPrintModal";
import { PAPER_PRESETS } from "./PostekConstants";

interface PostekLeftControlsProps {
  items: PrintItem[];
  quantities: Record<string, number>;
  handleUpdateQty: (id: string, val: string) => void;

  paperPreset: string;
  setPaperPreset: (v: string) => void;
  paperWidth: number;
  setPaperWidth: (v: number) => void;
  paperHeight: number;
  setPaperHeight: (v: number) => void;
  columns: number;
  setColumns: (v: number) => void;
  stickerWidth: number;
  setStickerWidth: (v: number) => void;
  horizontalGap: number;
  setHorizontalGap: (v: number) => void;

  dpi: 203 | 300;
  setDpi: (v: 203 | 300) => void;
  gap: number;
  setGap: (v: number) => void;
  density: number;
  setDensity: (v: number) => void;
  speed: number;
  setSpeed: (v: number) => void;
  marginTop: number;
  setMarginTop: (v: number) => void;
  marginLeft: number;
  setMarginLeft: (v: number) => void;

  totalLabels: number;
  isPrinting: boolean;
  handlePrint: () => void;
}

export const PostekLeftControls: React.FC<PostekLeftControlsProps> = ({
  items,
  quantities,
  handleUpdateQty,

  paperPreset,
  setPaperPreset,
  paperWidth,
  setPaperWidth,
  paperHeight,
  setPaperHeight,
  columns,
  setColumns,
  stickerWidth,
  setStickerWidth,
  horizontalGap,
  setHorizontalGap,

  dpi,
  setDpi,
  gap,
  setGap,
  density,
  setDensity,
  speed,
  setSpeed,
  marginTop,
  setMarginTop,
  marginLeft,
  setMarginLeft,

  totalLabels,
  isPrinting,
  handlePrint,
}) => {
  const handlePresetChange = (presetId: string) => {
    setPaperPreset(presetId);
    if (presetId !== "custom") {
      const preset = PAPER_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setPaperWidth(preset.width);
        setPaperHeight(preset.height);
        setColumns(preset.columns);
        // Fallback to dividing paper by columns if unspecified in preset
        setStickerWidth(preset.stickerWidth || preset.width / preset.columns);
        setHorizontalGap(preset.horizontalGap || 0);
      }
    }
  };

  return (
    <div className="w-1/3 flex flex-col border-r bg-white h-full relative z-10">
      <DialogHeader className="p-6 border-b shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-orange-500/30">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black italic text-slate-900">
              POSTEK PRINTER
            </DialogTitle>
            <div className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest mt-1">
              Ready
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto">
        {/* Paper Setup */}
        <div className="p-5 border-b bg-slate-50/50 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Paper Setup
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Preset Sizes
              </label>
              <Select value={paperPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-9 text-xs font-bold bg-white">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_PRESETS.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="text-xs font-bold"
                    >
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  W (mm)
                </label>
                <Input
                  type="number"
                  className="h-9 text-xs font-bold"
                  value={paperWidth}
                  onChange={(e) => {
                    setPaperWidth(Number(e.target.value));
                    if (paperPreset !== "custom") setPaperPreset("custom");
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  H (mm)
                </label>
                <Input
                  type="number"
                  className="h-9 text-xs font-bold"
                  value={paperHeight}
                  onChange={(e) => {
                    setPaperHeight(Number(e.target.value));
                    if (paperPreset !== "custom") setPaperPreset("custom");
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Cols
                </label>
                <Input
                  type="number"
                  min={1}
                  className="h-9 text-xs font-bold"
                  value={columns}
                  onChange={(e) => {
                    setColumns(Number(e.target.value));
                    if (paperPreset !== "custom") setPaperPreset("custom");
                  }}
                />
              </div>
            </div>

            {columns > 1 && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 border-dashed">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Sticker W (mm)
                  </label>
                  <Input
                    type="number"
                    className="h-9 text-xs font-bold"
                    value={stickerWidth}
                    onChange={(e) => {
                      setStickerWidth(Number(e.target.value));
                      if (paperPreset !== "custom") setPaperPreset("custom");
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    H-Gap (mm)
                  </label>
                  <Input
                    type="number"
                    className="h-9 text-xs font-bold"
                    value={horizontalGap}
                    onChange={(e) => {
                      setHorizontalGap(Number(e.target.value));
                      if (paperPreset !== "custom") setPaperPreset("custom");
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hardware Constraints */}
        <div className="p-5 border-b bg-white flex flex-col gap-4">
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            Hardware Output Config
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                DPI Base
              </label>
              <Select
                value={dpi.toString()}
                onValueChange={(val) => setDpi(Number(val) as 203 | 300)}
              >
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="203" className="text-xs font-bold">
                    203 DPI (8 dots/mm)
                  </SelectItem>
                  <SelectItem value="300" className="text-xs font-bold">
                    300 DPI (12 dots/mm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Gap (mm)
              </label>
              <Input
                type="number"
                className="h-9 text-xs font-bold"
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Density (1-15)
              </label>
              <Input
                type="number"
                min={1}
                max={15}
                className="h-9 text-xs font-bold"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Speed (2-6)
              </label>
              <Input
                type="number"
                min={2}
                max={6}
                className="h-9 text-xs font-bold"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Margin Top (mm)
              </label>
              <Input
                type="number"
                className="h-9 text-xs font-bold"
                value={marginTop}
                onChange={(e) => setMarginTop(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Margin L (mm)
              </label>
              <Input
                type="number"
                className="h-9 text-xs font-bold"
                value={marginLeft}
                onChange={(e) => setMarginLeft(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Input Selection List */}
        <div className="px-5 py-3 bg-slate-50 border-b flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Print Queue
          </span>
          <Badge variant="outline" className="bg-white font-mono text-[10px]">
            {items.length} SKUs
          </Badge>
        </div>
        <div className="p-3 space-y-2 bg-slate-50/30">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 bg-white"
            >
              <div className="flex flex-col min-w-0 pr-4">
                <span className="font-bold text-sm truncate">{item.name}</span>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  SKU: {item.sku}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                  Qty
                </span>
                <Input
                  type="number"
                  min={0}
                  className="w-16 h-8 text-xs font-black text-center"
                  value={quantities[item.id] ?? 0}
                  onChange={(e) => handleUpdateQty(item.id, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 border-t bg-white shrink-0 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Total Labels
          </span>
          <span className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none mt-1">
            {totalLabels}
          </span>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600 h-12 px-8 rounded-xl font-black italic uppercase tracking-widest text-white shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
          onClick={handlePrint}
          disabled={totalLabels === 0 || isPrinting}
        >
          {isPrinting ? (
            "SPOOLING..."
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" /> SEND TSPL
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
