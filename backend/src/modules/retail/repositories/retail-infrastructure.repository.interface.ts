import {
  RetailGatewayNode,
  RetailLoadBalancer,
} from "../entities/retail.entity";

export abstract class IRetailInfrastructureRepository {
  // Gateway Nodes
  abstract listGatewayNodes(tenant_id: string): Promise<RetailGatewayNode[]>;
  abstract getGatewayNode(
    tenant_id: string,
    nodeId: string,
  ): Promise<RetailGatewayNode | null>;
  abstract updateGatewayStatus(
    tenant_id: string,
    nodeId: string,
    status: string,
  ): Promise<RetailGatewayNode>;
  abstract heartbeat(
    tenant_id: string,
    nodeId: string,
    healthScore: number,
  ): Promise<void>;

  // Load Balancers
  abstract listLoadBalancers(tenant_id: string): Promise<RetailLoadBalancer[]>;
  abstract getLoadBalancer(
    tenant_id: string,
    lbId: string,
  ): Promise<RetailLoadBalancer | null>;
  abstract createLoadBalancer(
    tenant_id: string,
    data: any,
  ): Promise<RetailLoadBalancer>;
  abstract updateLoadBalancer(
    tenant_id: string,
    lbId: string,
    data: any,
  ): Promise<RetailLoadBalancer>;
}
