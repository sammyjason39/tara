import { PrismaService } from "../../persistence/prisma.service";

/**
 * Check if a specific module key is active (enabled) for a given tenant.
 * Use this inside controllers/services to conditionally include module data.
 *
 * @param prisma - PrismaService instance
 * @param tenant_id - The tenant to check
 * @param moduleKey - e.g. "retail", "finance", "hr", "it"
 * @returns true if the module exists and is enabled for the tenant
 */
export async function isModuleActive(
  prisma: PrismaService,
  tenant_id: string,
  moduleKey: string,
): Promise<boolean> {
  const status = await prisma.admin_module_statuses.findUnique({
    where: {
      tenant_id_module_key: { tenant_id: tenant_id, module_key: moduleKey },
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
  tenant_id: string,
): Promise<string[]> {
  const statuses = await prisma.admin_module_statuses.findMany({
    where: { tenant_id: tenant_id, enabled: true },
    select: { module_key: true },
  });
  return (statuses as any[]).map((s) => s.moduleKey as string);
}
