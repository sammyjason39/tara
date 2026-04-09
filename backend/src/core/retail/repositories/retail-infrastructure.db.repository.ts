import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { IRetailInfrastructureRepository } from "./retail-infrastructure.repository.interface";
import {
  RetailGatewayNode,
  RetailLoadBalancer,
} from "../entities/retail.entity";

@Injectable()
export class RetailInfrastructureDbRepository implements IRetailInfrastructureRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GATEWAY NODES
  // ============================================================

  async listGatewayNodes(tenantId: string): Promise<RetailGatewayNode[]> {
    const nodes = await this.prisma.retailGatewayNode.findMany({
      where: { tenantId: tenantId },
      orderBy: { nodeName: "asc" },
    });
    return nodes.map(this.mapNode);
  }

  async getGatewayNode(
    tenantId: string,
    nodeId: string,
  ): Promise<RetailGatewayNode | null> {
    const node = await this.prisma.retailGatewayNode.findFirst({
      where: { id: nodeId, tenantId: tenantId },
    });
    return node ? this.mapNode(node) : null;
  }

  async updateGatewayStatus(
    tenantId: string,
    nodeId: string,
    status: string,
  ): Promise<RetailGatewayNode> {
    const node = await this.prisma.retailGatewayNode.update({
      where: { id: nodeId, tenantId: tenantId },
      data: { status },
    });
    return this.mapNode(node);
  }

  async heartbeat(
    tenantId: string,
    nodeId: string,
    healthScore: number,
  ): Promise<void> {
    await this.prisma.retailGatewayNode.update({
      where: { id: nodeId, tenantId: tenantId },
      data: {
        lastHeartbeat: new Date(),
        healthScore,
      },
    });
  }

  // ============================================================
  // LOAD BALANCERS
  // ============================================================

  async listLoadBalancers(tenantId: string): Promise<RetailLoadBalancer[]> {
    const lbs = await this.prisma.retailLoadBalancer.findMany({
      where: { tenantId: tenantId },
      include: { retailGatewayNodes: true },
      orderBy: { name: "asc" },
    });
    return lbs.map(this.mapLoadBalancer);
  }

  async getLoadBalancer(
    tenantId: string,
    lbId: string,
  ): Promise<RetailLoadBalancer | null> {
    const lb = await this.prisma.retailLoadBalancer.findFirst({
      where: { id: lbId, tenantId: tenantId },
      include: { retailGatewayNodes: true },
    });
    return lb ? this.mapLoadBalancer(lb) : null;
  }

  async createLoadBalancer(
    tenantId: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    const lb = await this.prisma.retailLoadBalancer.create({
      data: {
        id: 'hgop1jun',
        updatedAt: new Date(),
        tenantId: tenantId,
        name: data.name,
        virtualIp: data.virtualIp,
        algorithm: data.algorithm || "ROUND_ROBIN",
        status: "ONLINE",
      },
      include: { retailGatewayNodes: true },
    });
    return this.mapLoadBalancer(lb);
  }

  async updateLoadBalancer(
    tenantId: string,
    lbId: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    const lb = await this.prisma.retailLoadBalancer.update({
      where: { id: lbId, tenantId: tenantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status }),
        ...(data.algorithm && { algorithm: data.algorithm }),
      },
      include: { retailGatewayNodes: true },
    });
    return this.mapLoadBalancer(lb);
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapNode(n: any): RetailGatewayNode {
    return {
      id: n.id,
      tenant_id: n.tenantId,
      load_balancer_id: n.loadBalancerId,
      node_name: n.nodeName,
      ip_address: n.ipAddress,
      port: n.port,
      status: n.status as any,
      health_score: n.healthScore,
      last_heartbeat: n.lastHeartbeat,
      version: n.version,
      region: n.region,
      created_at: n.createdAt,
      updated_at: n.updatedAt,
    };
  }

  private mapLoadBalancer(l: any): RetailLoadBalancer {
    return {
      id: l.id,
      tenant_id: l.tenantId,
      name: l.name,
      virtual_ip: l.virtualIp,
      algorithm: l.algorithm,
      status: l.status as any,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
      nodes: l.retailGatewayNodes?.map(this.mapNode),
    };
  }
}
