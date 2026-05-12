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

  async listGatewayNodes(tenant_id: string): Promise<RetailGatewayNode[]> {
    const nodes = await this.prisma.retail_gateway_nodes.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { node_name: "asc" },
    });
    return nodes.map(this.mapNode);
  }

  async getGatewayNode(
    tenant_id: string,
    nodeId: string,
  ): Promise<RetailGatewayNode | null> {
    const node = await this.prisma.retail_gateway_nodes.findFirst({
      where: { id: nodeId, tenant_id: tenant_id },
    });
    return node ? this.mapNode(node) : null;
  }

  async updateGatewayStatus(
    tenant_id: string,
    nodeId: string,
    status: string,
  ): Promise<RetailGatewayNode> {
    const node = await this.prisma.retail_gateway_nodes.update({
      where: { id: nodeId, tenant_id: tenant_id },
      data: { status },
    });
    return this.mapNode(node);
  }

  async heartbeat(
    tenant_id: string,
    nodeId: string,
    healthScore: number,
  ): Promise<void> {
    await this.prisma.retail_gateway_nodes.update({
      where: { id: nodeId, tenant_id: tenant_id },
      data: {
        last_heartbeat: new Date(),
        health_score: healthScore,
      },
    });
  }

  async recordHeartbeat(
    tenant_id: string,
    deviceId: string,
    component: string,
    status: string,
    metrics?: any,
  ): Promise<void> {
    try {
      console.log(`[INFRA_REPO] Recording heartbeat for ${deviceId} (Tenant: ${tenant_id})`);
      
      // 1. Upsert it_devices (Asset tracking)
      await this.prisma.it_devices.upsert({
        where: { id: deviceId },
        update: {
          last_heartbeat: new Date(),
          status: status,
        },
        create: {
          id: deviceId,
          tenant_id: tenant_id,
          name: deviceId,
          type: "TERMINAL_POS",
          status: status,
          connection: "ONLINE",
          last_heartbeat: new Date(),
        },
      });

      // 2. Log to it_system_health (Diagnostic stream)
      await this.prisma.it_system_health.create({
        data: {
          tenant_id: tenant_id,
          component: component || "RETAIL_NODE",
          status: status,
          latency_ms: metrics?.latency || 0,
          checked_at: new Date(),
        },
      });
      
      console.log(`[INFRA_REPO] Heartbeat recorded successfully for ${deviceId}`);
    } catch (error) {
      console.error(`[INFRA_REPO] Error recording heartbeat for ${deviceId}:`, error);
      throw error;
    }
  }

  // ============================================================
  // LOAD BALANCERS
  // ============================================================

  async listLoadBalancers(tenant_id: string): Promise<RetailLoadBalancer[]> {
    const lbs = await this.prisma.retail_load_balancers.findMany({
      where: { tenant_id: tenant_id },
      include: { retail_gateway_nodes: true },
      orderBy: { name: "asc" },
    });
    return lbs.map(this.mapLoadBalancer);
  }

  async getLoadBalancer(
    tenant_id: string,
    lbId: string,
  ): Promise<RetailLoadBalancer | null> {
    const lb = await this.prisma.retail_load_balancers.findFirst({
      where: { id: lbId, tenant_id: tenant_id },
      include: { retail_gateway_nodes: true },
    });
    return lb ? this.mapLoadBalancer(lb) : null;
  }

  async createLoadBalancer(
    tenant_id: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    const lb = await this.prisma.retail_load_balancers.create({
      data: {
        id: 'hgop1jun',
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        virtual_ip: data.virtualIp,
        algorithm: data.algorithm || "ROUND_ROBIN",
        status: "ONLINE",
      },
      include: { retail_gateway_nodes: true },
    });
    return this.mapLoadBalancer(lb);
  }

  async updateLoadBalancer(
    tenant_id: string,
    lbId: string,
    data: any,
  ): Promise<RetailLoadBalancer> {
    const lb = await this.prisma.retail_load_balancers.update({
      where: { id: lbId, tenant_id: tenant_id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status }),
        ...(data.algorithm && { algorithm: data.algorithm }),
      },
      include: { retail_gateway_nodes: true },
    });
    return this.mapLoadBalancer(lb);
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapNode(n: any): RetailGatewayNode {
    return {
      id: n.id,
      tenant_id: n.tenant_id,
      load_balancer_id: n.loadBalancerId,
      node_name: n.nodeName,
      ip_address: n.ip_address,
      port: n.port,
      status: n.status as any,
      health_score: n.healthScore,
      last_heartbeat: n.lastHeartbeat,
      version: n.version,
      region: n.region,
      created_at: n.created_at,
      updated_at: n.updated_at,
    };
  }

  private mapLoadBalancer(l: any): RetailLoadBalancer {
    return {
      id: l.id,
      tenant_id: l.tenant_id,
      name: l.name,
      virtual_ip: l.virtualIp,
      algorithm: l.algorithm,
      status: l.status as any,
      created_at: l.created_at,
      updated_at: l.updated_at,
      nodes: l.retailGatewayNodes?.map(this.mapNode),
    };
  }
}
