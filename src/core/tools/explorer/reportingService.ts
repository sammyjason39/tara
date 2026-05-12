import { createFolder, listFileSystem, uploadFile } from "./service";
import type { SessionContext } from "@/core/security/session";
import { format } from "date-fns";

/**
 * Ensures a nested folder path exists in the Explorer.
 * Returns the ID of the leaf folder.
 */
export async function ensureFolderPath(session: SessionContext, path: string): Promise<string | undefined> {
  const parts = path.split("/").filter(p => p.length \u003e 0);
  let currentParentId: string | undefined = undefined;

  for (const part of parts) {
    const { folders } = await listFileSystem(session, currentParentId);
    const existing = folders.find(f =\u003e f.name.toLowerCase() === part.toLowerCase());
    
    if (existing) {
      currentParentId = existing.id;
    } else {
      const newFolder = await createFolder(session, part, currentParentId);
      currentParentId = newFolder.id;
    }
  }
  
  return currentParentId;
}

export interface ReportItem {
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  location?: string;
  image?: string;
}

/**
 * Generates and saves a Stock Opname report to the Explorer as a JSON file
 * to enable specialized preview rendering.
 */
export async function saveStockOpnameReport(
  session: SessionContext,
  locationName: string,
  auditorName: string,
  items: ReportItem[]
) {
  const now = new Date();
  const year = format(now, "yyyy");
  const month = format(now, "MMMM");
  const timestamp = format(now, "yyyy-MM-dd_HH-mm");
  
  const folderPath = `Stock Opname/${locationName}/${year}/${month}`;
  const folderId = await ensureFolderPath(session, folderPath);
  
  // Save as .json for specialized Explorer preview
  const fileName = `Stock Opname ${locationName} ${timestamp}.json`;
  
  const reportData = {
    items: items.map(item => ({
      sku: item.sku,
      name: item.name,
      expected_quantity: item.systemCount || 0,
      actual_quantity: item.actualCount,
      variance: item.actualCount - (item.systemCount || 0),
      image: item.image,
    }))
  };

  const metadata = {
    type: "STOCK_OPNAME_REPORT",
    location: locationName,
    timestamp: now.toISOString(),
    performer: auditorName,
  };
  
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });
  
  return await uploadFile(session, file, folderId, undefined, metadata);
}
