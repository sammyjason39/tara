import { stock_movements as StockMovement, stock_levels as StockLevel } from "@prisma/client";
import { StockIntakeDto } from "../../dto/stock-intake.dto";
import { TransferStockDto } from "../../dto/transfer-stock.dto";

export interface StockReservation {
  product_id: string;
  location_id: string;
  quantity: number;
  referenceId: string;
  referenceType: string;
}

export interface IStockMovementRepository {
  /**
   * Atomic stock intake (PO receipt / Manual)
   */
  intake(tenant_id: string, data: StockIntakeDto, tx?: any): Promise<StockMovement>;

  /**
   * Atomic stock transfer between locations
   */
  transfer(tenant_id: string, data: TransferStockDto, tx?: any): Promise<StockMovement[]>;

  /**
   * Atomic stock consumption (Sales / Production / Waste)
   */
  consume(tenant_id: string, data: any, tx?: any): Promise<StockMovement>;

  /**
   * Set aside stock for a future transaction
   */
  reserve(tenant_id: string, data: StockReservation, tx?: any): Promise<void>;

  /**
   * Release or cancel a reservation
   */
  release(tenant_id: string, data: StockReservation, tx?: any): Promise<void>;

  /**
   * Historical query for movements
   */
  findAll(tenant_id: string, filters?: any): Promise<StockMovement[]>;

  /**
   * Find current balances
   */
  getBalances(tenant_id: string, location_id?: string, product_id?: string): Promise<StockLevel[]>;
}
