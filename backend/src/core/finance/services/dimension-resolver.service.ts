import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DimensionResolverService {
  private readonly logger = new Logger(DimensionResolverService.name);

  /**
   * Resolves dimensions (Branch, Dept, Project, Channel) from event metadata.
   */
  async resolveDimensions(payload: any, metadata?: any): Promise<Record<string, string | undefined>> {
    return {
      dimensionBranchId: payload.branch_id || metadata?.terminalBranchId || 'DEFAULT-BR',
      dimensionDepartmentId: payload.departmentId || 'DEFAULT-DEPT',
      dimensionProjectId: payload.projectId,
      dimensionChannelId: payload.channelId || 'DIRECT',
    };
  }
}
