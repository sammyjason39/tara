import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DragEndEvent } from "@dnd-kit/core";
import { generateTSPL, sendToLocalBridge, BlockPosition } from "./PostekEngine";

import {
  PREVIEW_SCALE,
  PAPER_PRESETS,
  defaultLayout,
} from "./postek/PostekConstants";
import { PostekLeftControls } from "./postek/PostekLeftControls";
import { PostekPreviewPane } from "./postek/PostekPreviewPane";

export interface PrintItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  price?: number;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  items: PrintItem[];
}

export const PostekPrintModal: React.FC<DialogProps> = ({
  open,
  onClose,
  items,
}) => {
  const { toast } = useToast();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paperPreset, setPaperPreset] = useState<string>("50x30");
  const [paperWidth, setPaperWidth] = useState(50);
  const [paperHeight, setPaperHeight] = useState(30);
  const [columns, setColumns] = useState(1);
  const [stickerWidth, setStickerWidth] = useState(50);
  const [horizontalGap, setHorizontalGap] = useState(0);
  const [layout, setLayout] = useState<BlockPosition[]>(defaultLayout);

  const [dpi, setDpi] = useState<203 | 300>(203);
  const [gap, setGap] = useState(2);
  const [density, setDensity] = useState(8);
  const [speed, setSpeed] = useState(4);
  const [marginTop, setMarginTop] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (open && items.length > 0) {
      setQuantities((prev) => {
        const next: Record<string, number> = {};
        items.forEach((item) => {
          next[item.id] = prev[item.id] || 1;
        });
        return next;
      });
    }
  }, [open, items]);

  const totalLabels = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleUpdateQty = (id: string, val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setQuantities((prev) => ({ ...prev, [id]: parsed }));
    } else if (val === "") {
      setQuantities((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active) return;

    setLayout((prevLayout) =>
      prevLayout.map((block) => {
        if (block.id === active.id) {
          const deltaXmm = delta.x / PREVIEW_SCALE;
          const deltaYmm = delta.y / PREVIEW_SCALE;

          let newX = Math.round(block.x + deltaXmm);
          let newY = Math.round(block.y + deltaYmm);

          const currentColWidth =
            columns > 1 ? paperWidth / columns : paperWidth;

          // Constraints ensure printing won't fall off the specific die-cut sticker
          newX = Math.max(
            -marginLeft,
            Math.min(newX, currentColWidth - block.width - marginLeft),
          );
          newY = Math.max(
            -marginTop,
            Math.min(newY, paperHeight - block.height - marginTop),
          );

          return { ...block, x: newX, y: newY };
        }
        return block;
      }),
    );
  };

  const handlePrint = async () => {
    if (totalLabels === 0) return;
    setIsPrinting(true);

    try {
      const tsItem = {
        name: items[0]?.name || "",
        barcode: items[0]?.barcode || "00000000",
        price: items[0]?.price,
      };

      const settings = { gap, density, speed, marginTop, marginLeft };
      const tspl = generateTSPL(
        tsItem,
        layout,
        paperWidth,
        paperHeight,
        columns,
        dpi,
        settings,
      );

      await sendToLocalBridge(tspl);

      toast({
        title: "Sent to Postek Printer",
        description: `Successfully transmitted TSPL sequence.`,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Print Failed",
        description:
          "Could not connect to the local printer socket over USB/Bridge.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-6xl rounded-[2rem] p-0 overflow-hidden bg-slate-50 flex h-[85vh] border-none shadow-2xl">
        <PostekLeftControls
          items={items}
          quantities={quantities}
          handleUpdateQty={handleUpdateQty}
          paperPreset={paperPreset}
          setPaperPreset={setPaperPreset}
          paperWidth={paperWidth}
          setPaperWidth={setPaperWidth}
          paperHeight={paperHeight}
          setPaperHeight={setPaperHeight}
          columns={columns}
          setColumns={setColumns}
          stickerWidth={stickerWidth}
          setStickerWidth={setStickerWidth}
          horizontalGap={horizontalGap}
          setHorizontalGap={setHorizontalGap}
          dpi={dpi}
          setDpi={setDpi}
          gap={gap}
          setGap={setGap}
          density={density}
          setDensity={setDensity}
          speed={speed}
          setSpeed={setSpeed}
          marginTop={marginTop}
          setMarginTop={setMarginTop}
          marginLeft={marginLeft}
          setMarginLeft={setMarginLeft}
          totalLabels={totalLabels}
          isPrinting={isPrinting}
          handlePrint={handlePrint}
        />

        <PostekPreviewPane
          paperWidth={paperWidth}
          paperHeight={paperHeight}
          columns={columns}
          gap={gap}
          horizontalGap={horizontalGap}
          stickerWidth={stickerWidth}
          marginTop={marginTop}
          marginLeft={marginLeft}
          layout={layout}
          handleDragEnd={handleDragEnd}
          items={items}
        />
      </DialogContent>
    </Dialog>
  );
};
