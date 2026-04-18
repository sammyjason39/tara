import { Injectable } from "@nestjs/common";
import { IRetailInfrastructureRepository } from "./repositories/retail-infrastructure.repository.interface";
import {
  RetailGatewayNode,
  RetailLoadBalancer,
} from "./entities/retail.entity";

@Injectable()
export class RetailInfrastructureService {
  constructor(private readonly infraRepo: IRetailInfrastructureRepository) {}

  async listGatewayNodes(tenant_id: string): Promise<RetailGatewayNode[]> {
    return this.infraRepo.listGatewayNodes(tenant_id);
  }

  async getGatewayNode(
    tenant_id: string,
    nodeId: string,
  ): Promise<RetailGatewayNode | null> {
    return this.infraRepo.getGatewayNode(tenant_id, nodeId);
  }

  async setNodeStatus(
    tenant_id: string,
    nodeId: string,
    status: "ACTIVE" | "STANDBY" | "DOWN",
  ): Promise<RetailGatewayNode> {
    return this.infraRepo.updateGatewayStatus(tenant_id, nodeId, status);
  }

  async listLoadBalancers(tenant_id: string): Promise<RetailLoadBalancer[]> {
    return this.infraRepo.listLoadBalancers(tenant_id);
  }

  async createLoadBalancer(
    tenant_id: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    return this.infraRepo.createLoadBalancer(tenant_id, data);
  }

  async updateLoadBalancer(
    tenant_id: string,
    lbId: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    return this.infraRepo.updateLoadBalancer(tenant_id, lbId, data);
  }
}
