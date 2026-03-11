import { BlockPosition } from "../PostekEngine";

export const PREVIEW_SCALE = 4; // 1 mm = 4 px

export const PAPER_PRESETS = [
  {
    id: "33x15",
    name: "33x15mm (Retail Small)",
    width: 33,
    height: 15,
    columns: 1,
  },
  {
    id: "33x20",
    name: "33x20mm (Retail Standard)",
    width: 33,
    height: 20,
    columns: 1,
  },
  {
    id: "38x25",
    name: "38x25mm (Mini Product)",
    width: 38,
    height: 25,
    columns: 1,
  },
  {
    id: "50x30",
    name: "50x30mm (Standard Barcode)",
    width: 50,
    height: 30,
    columns: 1,
  },
  {
    id: "60x40",
    name: "60x40mm (Product Label)",
    width: 60,
    height: 40,
    columns: 1,
  },
  {
    id: "75x50",
    name: "75x50mm (Warehouse)",
    width: 75,
    height: 50,
    columns: 1,
  },
  {
    id: "100x50",
    name: "100x50mm (Shipping Short)",
    width: 100,
    height: 50,
    columns: 1,
  },
  {
    id: "100x150",
    name: "100x150mm (Shipping A6)",
    width: 100,
    height: 150,
    columns: 1,
  },
  {
    id: "72x16x2",
    name: "33x14mm (2 Column Shelf Roll)",
    width: 72,
    height: 16,
    columns: 2,
    stickerWidth: 33,
    horizontalGap: 2,
  },
  {
    id: "custom",
    name: "Custom (25–110mm)",
    width: 50,
    height: 30,
    columns: 1,
  },
];

export const defaultLayout: BlockPosition[] = [
  { id: "name", x: 3, y: 2, width: 44, height: 5 },
  { id: "barcode", x: 3, y: 8, width: 44, height: 14 },
  { id: "price", x: 3, y: 24, width: 44, height: 5 },
];
