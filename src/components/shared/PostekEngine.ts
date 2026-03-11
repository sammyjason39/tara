export interface BlockPosition {
  id: "name" | "barcode" | "price";
  x: number; // millimeters
  y: number; // millimeters
  width: number; // millimeters
  height: number; // millimeters
}

export interface PostekSettings {
  gap: number; // mm
  density: number; // 1-15
  speed: number; // 2-6
  marginTop: number; // mm
  marginLeft: number; // mm
}

export interface PrintItemData {
  name: string;
  barcode: string | undefined;
  price?: number;
}

export const mmToDots = (mm: number, dpi: 203 | 300): number => {
  const dotsPerMm = dpi === 203 ? 8 : 12;
  return Math.round(mm * dotsPerMm);
};

export const generateTSPL = (
  item: PrintItemData,
  layout: BlockPosition[],
  paperWidth: number,
  paperHeight: number,
  columns: number,
  dpi: 203 | 300,
  settings: PostekSettings,
): string => {
  let tspl = `SIZE ${paperWidth} mm, ${paperHeight} mm\n`;
  tspl += `GAP ${settings.gap} mm,0\n`;
  tspl += `DENSITY ${settings.density}\n`;
  tspl += `SPEED ${settings.speed}\n`;
  tspl += `DIRECTION 1\n`;

  const refX = mmToDots(settings.marginLeft, dpi);
  const refY = mmToDots(settings.marginTop, dpi);
  tspl += `REFERENCE ${refX},${refY}\n`;
  tspl += `CLS\n`;

  const columnWidth = columns > 1 ? paperWidth / columns : paperWidth;

  for (let col = 0; col < columns; col++) {
    const xOffsetMm = col * columnWidth;

    for (const block of layout) {
      const finalXMm = block.x + xOffsetMm;
      const xDots = mmToDots(finalXMm, dpi);
      const yDots = mmToDots(block.y, dpi);
      const hDots = mmToDots(block.height, dpi);

      if (block.id === "name") {
        tspl += `TEXT ${xDots},${yDots},"0",0,1,1,"${item.name}"\n`;
      } else if (block.id === "barcode") {
        const barcodeVal = item.barcode || "N/A";
        tspl += `BARCODE ${xDots},${yDots},"128",${hDots},1,0,2,2,"${barcodeVal}"\n`;
      } else if (block.id === "price") {
        const priceStr = item.price ? item.price.toFixed(2) : "0.00";
        tspl += `TEXT ${xDots},${yDots},"0",0,1,1,"${priceStr}"\n`;
      }
    }
  }

  tspl += `PRINT 1,1\n`;
  return tspl;
};

export const sendToLocalBridge = async (tspl: string): Promise<void> => {
  console.log("--- TSPL OUTPUT ---");
  console.log(tspl);
  console.log("-------------------");
  // External USB/LAN bridge invocation. No fake timers or mock success.
  const response = await fetch("http://localhost:9100/print", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: tspl,
  });
  if (!response.ok) {
    throw new Error("Bridge returned error");
  }
};
