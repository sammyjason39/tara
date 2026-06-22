import { Injectable } from "@nestjs/common";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { CreatePaymentTransactionDto } from "../dto/create-payment-transaction.dto";
import { IPaymentRepository } from "../repositories/payment.repository.interface";
import { PaymentDevice } from "../entities/payment-device.entity";

/**
 * Result of resolving whether a specific payment context is offline.
 */
export interface OfflineContext {
  /** True when the payment context (device/branch) currently has no connectivity. */
  isOffline: boolean;
  /** Human-readable explanation of how the offline state was derived. */
  reason: string;
  /** The device the decision was based on, when a specific device was identified. */
  deviceId?: string;
}

/**
 * OfflineContextResolver (BUG-11)
 *
 * Derives the offline state of the *specific* payment context for a request from
 * actual device/branch connectivity, replacing the previous global
 * `process.env.OFFLINE_MODE` flag (which could not represent per-context state).
 *
 * Derivation rules:
 *   1. If the request targets a specific POS device (via `dto.source` matching a
 *      device code or id within the caller's scope), the context is offline iff
 *      that device's connectivity status is `offline`.
 *   2. Otherwise the decision is made at the branch/location level: among the
 *      devices in the caller's scope, the context is offline iff at least one
 *      device is registered for the context and none of them are `online`.
 *   3. If no payment devices are registered for the context, the context is
 *      treated as online (server-side/gateway connectivity is assumed).
 */
@Injectable()
export class OfflineContextResolver {
  constructor(private readonly repository: IPaymentRepository) {}

  async resolve(
    ctx: TenantContext,
    dto?: CreatePaymentTransactionDto,
  ): Promise<OfflineContext> {
    const devices = await this.repository.getDevices(ctx);
    const scoped = devices.filter((d) => this.matchesContextScope(d, ctx));

    // Rule 1: a specific device was identified for this request.
    const targeted = this.findTargetedDevice(scoped, dto);
    if (targeted) {
      const isOffline = targeted.status === "offline";
      return {
        isOffline,
        deviceId: targeted.id,
        reason: isOffline
          ? `Device ${targeted.deviceCode} is offline`
          : `Device ${targeted.deviceCode} is ${targeted.status}`,
      };
    }

    // Rule 3: no devices registered for this context -> assume online.
    if (scoped.length === 0) {
      return {
        isOffline: false,
        reason: "No payment devices registered for context; treated as online",
      };
    }

    // Rule 2: branch/location-level connectivity.
    const anyOnline = scoped.some((d) => d.status === "online");
    return {
      isOffline: !anyOnline,
      reason: anyOnline
        ? "At least one payment device in context is online"
        : "All payment devices in context are offline",
    };
  }

  /**
   * Restricts the device set to the caller's branch/location when such a scope is
   * present on the context. Devices are already tenant-scoped by the repository.
   */
  private matchesContextScope(device: PaymentDevice, ctx: TenantContext): boolean {
    const contextLocation = ctx.location_id || ctx.branch_id;
    if (!contextLocation) return true;
    if (!device.location) return false;
    return device.location === contextLocation;
  }

  /**
   * Resolves the specific device a request targets, if any, by matching the
   * request `source` against a device code or id within scope.
   */
  private findTargetedDevice(
    scoped: PaymentDevice[],
    dto?: CreatePaymentTransactionDto,
  ): PaymentDevice | undefined {
    const source = dto?.source;
    if (!source) return undefined;
    return scoped.find((d) => d.deviceCode === source || d.id === source);
  }
}
