import { Injectable, Logger, Inject } from '@nestjs/common';
import { Asset, AssetType } from '../domain/asset.interfaces';
import { PostingGatewayService } from './posting-gateway.service';
import { IAssetCategoryRepository } from '../repositories/interfaces/asset-category.repository.interface';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    @Inject('IAssetCategoryRepository')
    private readonly categoryRepo: IAssetCategoryRepository,
  ) {}

  /**
   * Registers a new fixed asset and triggers the acquisition posting.
   */
  async acquireAsset(asset: Asset): Promise<void> {
    this.logger.log(`Acquiring Asset: ${asset.name} (Cat: ${asset.category_id}) for ${asset.acquisitionCost} ${asset.currency}`);

    const category = await this.categoryRepo.findById(asset.tenant_id, asset.company_id, asset.category_id);
    if (!category) throw new Error(`Asset Category ${asset.category_id} not found.`);

    const postingRequest = {
        request_id: `ASSET-ACQ-${asset.id}`,
        tenant_id: asset.tenant_id,
        company_id: asset.company_id,
        source_module: 'ASSET_MANAGEMENT',
        sourceEventId: asset.id,
        event_type: 'ASSET_ACQUIRED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          assetId: asset.id,
          cost: asset.acquisitionCost,
          currency: asset.currency,
          glAccountId: category.defaultAssetAccountId,
          fiscalPeriodId: '2026-03',
        },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      this.logger.log(`Asset ${asset.name} successfully acquired and posted.`);
    } else {
      this.logger.error(`Asset acquisition failed: ${result.errorMessage}`);
      throw new Error(`Financial posting failed: ${result.errorMessage}`);
    }
  }

  /**
   * Transfers an asset between branches.
   */
  async transferAsset(asset: Asset, toBranchId: string): Promise<void> {
    this.logger.log(`Transferring Asset ${asset.id} to Branch ${toBranchId}`);
    
    asset.branch_id = toBranchId;

    const postingRequest = {
        request_id: `ASSET-TRF-${asset.id}-${Date.now()}`,
        tenant_id: asset.tenant_id,
        company_id: asset.company_id,
        source_module: 'ASSET_MANAGEMENT',
        sourceEventId: `TRF-${asset.id}`,
        event_type: 'ASSET_TRANSFERRED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          assetId: asset.id,
          fromBranchId: asset.branch_id,
          toBranchId: toBranchId,
        },
        created_at: new Date(),
    };

    await this.gateway.postEvent(postingRequest as any);
  }

  /**
   * Disposes of a percentage of an asset.
   */
  async partialDispose(asset: Asset, percentage: number): Promise<void> {
    this.logger.log(`Partial Disposal of Asset ${asset.id}: ${percentage}%`);

    const postingRequest = {
        request_id: `ASSET-PDISP-${asset.id}-${Date.now()}`,
        tenant_id: asset.tenant_id,
        company_id: asset.company_id,
        source_module: 'ASSET_MANAGEMENT',
        sourceEventId: `PDISP-${asset.id}`,
        event_type: 'ASSET_DISPOSED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          assetId: asset.id,
          partialPercentage: percentage,
          fiscalPeriodId: '2026-03',
        },
        created_at: new Date(),
    };

    await this.gateway.postEvent(postingRequest as any);
  }
}
