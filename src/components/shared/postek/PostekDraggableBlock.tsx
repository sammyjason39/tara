import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockPosition } from "../PostekEngine";
import { PREVIEW_SCALE } from "./PostekConstants";

export const DraggableBlock = ({
  block,
  children,
  offsetX = 0,
  offsetY = 0,
}: {
  block: BlockPosition;
  children: React.ReactNode;
  offsetX?: number;
  offsetY?: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
    });

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${(block.x + offsetX) * PREVIEW_SCALE}px`,
    top: `${(block.y + offsetY) * PREVIEW_SCALE}px`,
    width: `${block.width * PREVIEW_SCALE}px`,
    height: `${block.height * PREVIEW_SCALE}px`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 20 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border border-transparent hover:border-blue-400 transition-colors bg-white/10",
        isDragging && "opacity-50 ring-2 ring-blue-500 shadow-xl",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
        {children}
      </div>
    </div>
  );
};
