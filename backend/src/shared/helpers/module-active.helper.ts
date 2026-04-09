import { PrismaService } from "../../persistence/prisma.service";

/**
 * Check if a specific module key is active (enabled) for a given tenant.
 * Use this inside controllers/services to conditionally include module data.
 *
 * @param prisma - PrismaService instance
 * @param tenantId - The tenant to check
 * @param moduleKey - e.g. "retail", "finance", "hr", "it"
 * @returns true if the module exists and is enabled for the tenant
 */
export async function isModuleActive(
  prisma: PrismaService,
  tenantId: string,
  moduleKey: string,
): Promise<boolean> {
  const status = await prisma.adminModuleStatus.findUnique({
    where: {
      tenantId_moduleKey: { tenantId, moduleKey },
    },
    select: { enabled: true },
  });
  return status?.enabled === true;
}

/**
 * Get all active module keys for a tenant.
 * @returns string[] of enabled module keys
 */
export async function getActiveModuleKeys(
  prisma: PrismaService,
  tenantId: string,
): Promise<string[]> {
  const statuses = await prisma.adminModuleStatus.findMany({
    where: { tenantId, enabled: true },
    select: { moduleKey: true },
  });
  return (statuses as any[]).map((s) => s.moduleKey as string);
}
