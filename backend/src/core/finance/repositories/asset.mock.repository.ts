import { Injectable } from '@nestjs/common';
import { IAssetRepository } from './interfaces/asset.repository.interface';
import { Asset } from '../domain/asset.interfaces';

@Injectable()
export class AssetMockRepository implements IAssetRepository {
  private assets: Asset[] = [];

  async findById(tenant_id: string, company_id: string, id: string): Promise<Asset | null> {
    return this.assets.find(a => a.tenant_id === tenant_id && a.company_id === company_id && a.id === id) || null;
  }

  async findAll(tenant_id: string, company_id: string): Promise<Asset[]> {
    return this.assets.filter(a => a.tenant_id === tenant_id && a.company_id === company_id);
  }

  async save(asset: Asset): Promise<Asset> {
    const index = this.assets.findIndex(a => a.id === asset.id);
    if (index >= 0) {
      this.assets[index] = asset;
    } else {
      this.assets.push(asset);
    }
    return asset;
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: any): Promise<void> {
    const asset = await this.findById(tenant_id, company_id, id);
    if (asset) asset.status = status;
  }
}
