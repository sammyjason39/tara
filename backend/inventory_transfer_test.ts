import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function testInventoryTransfer() {
  console.log("--- STARTING INVENTORY TRANSFER TEST ---");

  const tenantId = "bambu-tenant";
  const fromLocationCode = "BS-DS-LOC";
  const toLocationCode = "BS-SS-LOC";
  const userId = "4ac08f4c-7440-4816-b83c-bdeecae8d8b9"; // bambusilverkedonganan@gmail.com

  try {
    // 1. Get Locations
    const fromLoc = await prisma.locations.findFirst({ where: { tenant_id: tenantId, code: fromLocationCode } });
    const toLoc = await prisma.locations.findFirst({ where: { tenant_id: tenantId, code: toLocationCode } });

    if (!fromLoc || !toLoc) {
      throw new Error("Locations not found");
    }

    console.log(`From Location: ${fromLoc.name} (${fromLoc.id})`);
    console.log(`To Location: ${toLoc.name} (${toLoc.id})`);

    // 2. Ensure Category Exists
    let category = await prisma.product_categories.findFirst({ where: { tenant_id: tenantId } });
    if (!category) {
        category = await prisma.product_categories.create({
            data: {
                id: uuidv4(),
                tenant_id: tenantId,
                name: "Test Category",
            }
        });
    }

    // 3. Create a Test Item
    const sku = `TEST-TRANSFER-${Date.now()}`;
    const item = await prisma.item_masters.create({
      data: {
        id: uuidv4(),
        tenant_id: tenantId,
        category_id: category.id,
        sku: sku,
        name: "Test Transfer Item",
        barcode: sku,
        unit: "pcs",
        base_price: 1000,
        status: "active",
      }
    });
    console.log(`Created Item: ${item.name} (${item.sku})`);

    // 4. Initialize Stock in From Location
    const initialQty = 100;
    await prisma.stock_levels.create({
      data: {
        id: uuidv4(),
        tenant_id: tenantId,
        location_id: fromLoc.id,
        product_id: item.id,
        on_hand: initialQty,
        available: initialQty,
        reserved: 0,
        min_buffer: 0,
        max_capacity: 1000,
      }
    });
    console.log(`Initialized Stock: ${initialQty} at ${fromLoc.code}`);

    // 5. Initiate Stock Transfer (Core Inventory Feature)
    const transferQty = 30;
    const transferId = uuidv4();
    const transfer = await prisma.inventory_transfers.create({
      data: {
        id: transferId,
        tenant_id: tenantId,
        item_id: item.id,
        from_location_id: fromLoc.id,
        to_location_id: toLoc.id,
        quantity: transferQty,
        status: "PENDING",
        requested_by: userId,
        requested_at: new Date(),
      }
    });
    console.log(`Initiated Transfer: ${transfer.id} (Status: ${transfer.status}, Qty: ${transferQty})`);

    // 6. Ship the Transfer (Moves stock to Transit)
    console.log("Shipping Transfer...");
    
    const transitLocCode = `TRANSIT-${fromLoc.code}-${toLoc.code}`;
    let transitLoc = await prisma.locations.findFirst({ where: { tenant_id: tenantId, code: transitLocCode } });
    if (!transitLoc) {
        transitLoc = await prisma.locations.create({
            data: {
                id: uuidv4(),
                tenant_id: tenantId,
                name: `Transit: ${fromLoc.code} to ${toLoc.code}`,
                code: transitLocCode,
                type: "transit",
            }
        });
    }

    // Move from FROM to TRANSIT
    await prisma.$transaction(async (tx) => {
        // Deduct from source
        await tx.stock_levels.updateMany({
            where: { tenant_id: tenantId, location_id: fromLoc.id, product_id: item.id },
            data: { 
                on_hand: { decrement: transferQty },
                available: { decrement: transferQty }
            }
        });

        // Add to transit
        const existingTransit = await tx.stock_levels.findFirst({
            where: { tenant_id: tenantId, location_id: transitLoc.id, product_id: item.id }
        });
        if (existingTransit) {
            await tx.stock_levels.update({
                where: { id: existingTransit.id },
                data: { 
                    on_hand: { increment: transferQty },
                    available: { increment: transferQty }
                }
            });
        } else {
            await tx.stock_levels.create({
                data: {
                    id: uuidv4(),
                    tenant_id: tenantId,
                    location_id: transitLoc.id,
                    product_id: item.id,
                    on_hand: transferQty,
                    available: transferQty,
                    reserved: 0,
                    min_buffer: 0,
                    max_capacity: 0
                }
            });
        }

        // Update transfer status
        await tx.inventory_transfers.update({
            where: { id: transfer.id },
            data: {
                status: "IN_TRANSIT",
                shipped_by: userId,
                shipped_at: new Date(),
            }
        });
    });
    console.log("Transfer Shipped (Status: IN_TRANSIT)");

    // 7. Receive the Transfer (Retail Inventory Feature)
    console.log("Receiving Transfer...");
    await prisma.$transaction(async (tx) => {
        // Deduct from transit
        await tx.stock_levels.updateMany({
            where: { tenant_id: tenantId, location_id: transitLoc.id, product_id: item.id },
            data: { 
                on_hand: { decrement: transferQty },
                available: { decrement: transferQty }
            }
        });

        // Add to destination
        const existingDest = await tx.stock_levels.findFirst({
            where: { tenant_id: tenantId, location_id: toLoc.id, product_id: item.id }
        });
        if (existingDest) {
            await tx.stock_levels.update({
                where: { id: existingDest.id },
                data: { 
                    on_hand: { increment: transferQty },
                    available: { increment: transferQty }
                }
            });
        } else {
            await tx.stock_levels.create({
                data: {
                    id: uuidv4(),
                    tenant_id: tenantId,
                    location_id: toLoc.id,
                    product_id: item.id,
                    on_hand: transferQty,
                    available: transferQty,
                    reserved: 0,
                    min_buffer: 0,
                    max_capacity: 0
                }
            });
        }

        // Update transfer status
        await tx.inventory_transfers.update({
            where: { id: transfer.id },
            data: {
                status: "RECEIVED",
                received_by: userId,
                received_at: new Date()
            }
        });
    });
    console.log("Transfer Received (Status: RECEIVED)");

    // 8. Verify Results
    const finalFromStock = await prisma.stock_levels.findFirst({ where: { tenant_id: tenantId, location_id: fromLoc.id, product_id: item.id } });
    const finalToStock = await prisma.stock_levels.findFirst({ where: { tenant_id: tenantId, location_id: toLoc.id, product_id: item.id } });
    const finalTransitStock = await prisma.stock_levels.findFirst({ where: { tenant_id: tenantId, location_id: transitLoc.id, product_id: item.id } });

    console.log("--- VERIFICATION ---");
    console.log(`From Location Stock: ${finalFromStock?.on_hand} (Expected: ${initialQty - transferQty})`);
    console.log(`To Location Stock: ${finalToStock?.on_hand} (Expected: ${transferQty})`);
    console.log(`Transit Location Stock: ${finalTransitStock?.on_hand} (Expected: 0)`);

    const fromMatch = Number(finalFromStock?.on_hand) === (initialQty - transferQty);
    const toMatch = Number(finalToStock?.on_hand) === transferQty;
    const transitMatch = !finalTransitStock || Number(finalTransitStock?.on_hand) === 0;

    if (fromMatch && toMatch && transitMatch) {
        console.log("RESULT: SUCCESS");
    } else {
        console.log("RESULT: FAILED - Stock mismatch");
    }

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testInventoryTransfer();
