import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../../persistence/prisma.service";

@Injectable()
export class RetailSeeder {
  private readonly logger = new Logger(RetailSeeder.name);
  private readonly TENANT_ID = "comp-demo-a";

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    this.logger.log("Starting Retail Database Seeder...");

    try {
      // 1. Ensure Tenant and Location exist
      let company = await this.prisma.company.findUnique({
        where: { id: this.TENANT_ID },
      });

      if (!company) {
        this.logger.log("Creating default company...");
        company = await this.prisma.company.create({
          data: {
            id: this.TENANT_ID,
            name: "Zenvix Demo Corp",
            code: "ZDX",
            industry: "retail",
            updatedAt: new Date(),
          },
        });
      }

      // 1.2 Enable Retail Module + all Core Modules
      // Core modules are ALWAYS on when any industry module is active.
      // Without these entries, ModuleStateGuard blocks Finance/HR/IT API calls.
      const moduleKeysToEnable = [
        "retail",
        "finance",
        "hr",
        "it",
        "it-settings",
        "settings",
        "admin",
        "procurement",
        "sales",
        "inventory",
        "marketing",
        "payment",
      ];

      for (const moduleKey of moduleKeysToEnable) {
        await this.prisma.adminModuleStatus.upsert({
          where: {
            tenantId_moduleKey: {
              tenantId: this.TENANT_ID,
              moduleKey,
            },
          },
          update: { enabled: true, updatedBy: "system" },
          create: {
            id: uuidv4(),
            tenantId: this.TENANT_ID,
            moduleKey,
            enabled: true,
            updatedBy: "system",
          },
        });
      }
      this.logger.log(
        `Enabled ${moduleKeysToEnable.length} module keys for tenant ${this.TENANT_ID}`,
      );

      let location = await this.prisma.location.findFirst({
        where: { tenantId: this.TENANT_ID, type: "branch" },
      });

      if (!location) {
        this.logger.log("Creating default branch location...");
        location = await this.prisma.location.create({
          data: {
            id: "42txt9cs",
            updatedAt: new Date(),
            tenantId: this.TENANT_ID,
            name: "Grand Indonesia Flagship",
            code: "GI-001",
            type: "branch",
            currency: "IDR",
          },
        });
      }

      let store = await this.prisma.store.findFirst({
        where: { tenantId: this.TENANT_ID },
      });

      if (!store) {
        this.logger.log("Creating default store...");
        store = await this.prisma.store.create({
          data: {
            id: "u62hbe93",
            updatedAt: new Date(),
            tenantId: this.TENANT_ID,
            locationId: location.id,
            name: "GI Flagship Store",
            code: "GI-STR-1",
            type: "flagship",
            timezone: "Asia/Jakarta",
            currency: "IDR",
          },
        });
      }

      // 2. Categories
      this.logger.log("Seeding categories...");
      const electronicsCat = await this.prisma.productCategory.upsert({
        where: {
          tenantId_name: { tenantId: this.TENANT_ID, name: "Electronics" },
        },
        update: {},
        create: {
          tenantId: this.TENANT_ID,
          name: "Electronics",
        },
      });

      const clothingCat = await this.prisma.productCategory.upsert({
        where: {
          tenantId_name: { tenantId: this.TENANT_ID, name: "Clothing" },
        },
        update: {},
        create: {
          tenantId: this.TENANT_ID,
          name: "Clothing",
        },
      });

      const furnitureCat = await this.prisma.productCategory.upsert({
        where: {
          tenantId_name: { tenantId: this.TENANT_ID, name: "Furniture" },
        },
        update: {},
        create: {
          tenantId: this.TENANT_ID,
          name: "Furniture",
        },
      });

      // 3. Products & Stock
      this.logger.log("Seeding products...");
      const productsData = [
        {
          id: "prod-001-demo",
          sku: "ELEC-MBP-001",
          name: "MacBook Pro 14 M3",
          description: "High performance laptop",
          categoryId: electronicsCat.id,
          basePrice: 32999000,
          barcode: "888123456789",
          unit: "PCS",
          stock: 15,
        },
        {
          id: "prod-002-demo",
          sku: "ELEC-IPN-015",
          name: "iPhone 15 Pro",
          description: "Stronger than ever",
          categoryId: electronicsCat.id,
          basePrice: 18999000,
          barcode: "888987654321",
          unit: "PCS",
          stock: 42,
        },
        {
          id: "prod-003-demo",
          sku: "CLOTH-TEE-BLK",
          name: "Minimalist Black Tee",
          description: "100% Cotton",
          categoryId: clothingCat.id,
          basePrice: 249000,
          barcode: "111222333444",
          unit: "PCS",
          stock: 120,
        },
        {
          id: "prod-004-demo",
          sku: "CLOTH-HOOD-GRY",
          name: "Essential Hoodie",
          description: "Premium fleece",
          categoryId: clothingCat.id,
          basePrice: 599000,
          barcode: "111222333445",
          unit: "PCS",
          stock: 45,
        },
        {
          id: "prod-005-demo",
          sku: "FURN-CHR-OAK",
          name: "Oak Dining Chair",
          description: "Solid oak wood",
          categoryId: furnitureCat.id,
          basePrice: 1500000,
          barcode: "555666777888",
          unit: "PCS",
          stock: 24,
        },
        {
          id: "prod-006-demo",
          sku: "FURN-TBL-GLS",
          name: "Glass Coffee Table",
          description: "Tempered glass top",
          categoryId: furnitureCat.id,
          basePrice: 3200000,
          barcode: "555666777889",
          unit: "PCS",
          stock: 8,
        },
      ];

      for (const prodData of productsData) {
        const product = await this.prisma.itemMaster.upsert({
          where: {
            tenantId_sku: { tenantId: this.TENANT_ID, sku: prodData.sku },
          },
          update: {
            sku: prodData.sku,
            name: prodData.name,
            description: prodData.description,
            categoryId: prodData.categoryId,
            basePrice: prodData.basePrice,
            barcode: prodData.barcode,
          },
          create: {
            tenantId: this.TENANT_ID,
            sku: prodData.sku,
            name: prodData.name,
            description: prodData.description,
            categoryId: prodData.categoryId,
            basePrice: prodData.basePrice,
            barcode: prodData.barcode,
            unit: prodData.unit,
            type: "ITEM",
            status: "active",
            taxRate: 11,
          },
        });

        const stockLevel = await this.prisma.stockLevel.findFirst({
          where: { locationId: location.id, productId: product.id },
        });
        if (stockLevel) {
          await this.prisma.stockLevel.update({
            where: { id: stockLevel.id },
            data: { onHand: prodData.stock, available: prodData.stock },
          });
        } else {
          await this.prisma.stockLevel.create({
            data: {
              id: "fsgavby6",
              updatedAt: new Date(),
              tenantId: this.TENANT_ID,
              locationId: location.id,
              productId: product.id,
              onHand: prodData.stock,
              available: prodData.stock,
              reserved: 0,
            },
          });
        }
      }

      // 4. Seed showcase orders — one per fulfillment status
      this.logger.log("Seeding showcase orders...");

      const showcaseOrders = [
        {
          id: "order-demo-paid-001-demo",
          status: "paid",
          paymentMethod: "card",
          customerName: "Budi Santoso",
          items: [{ productSku: "ELEC-IPN-015", qty: 1, price: 18999000 }],
          total: 18999000,
          minutesAgo: 5,
        },
        {
          id: "order-demo-paid-002-demo",
          status: "paid",
          paymentMethod: "qr",
          customerName: "Siti Rahayu",
          items: [
            { productSku: "CLOTH-TEE-BLK", qty: 3, price: 249000 },
            { productSku: "CLOTH-HOOD-GRY", qty: 1, price: 599000 },
          ],
          total: 1346000,
          minutesAgo: 12,
        },
        {
          id: "order-demo-paid-003-demo",
          status: "paid",
          paymentMethod: "card",
          customerName: "John Doe",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 2, price: 150000 }],
          total: 300000,
          minutesAgo: 30,
        },
        {
          id: "order-demo-paid-004-demo",
          status: "paid",
          paymentMethod: "cash",
          customerName: "Alice Wonderland",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 1500000 }],
          total: 1500000,
          minutesAgo: 15,
        },
        {
          id: "order-demo-processing-001-demo",
          status: "processing",
          paymentMethod: "card",
          customerName: "Ahmad Fauzi",
          items: [{ productSku: "ELEC-MBP-001", qty: 1, price: 32999000 }],
          total: 32999000,
          minutesAgo: 25,
        },
        {
          id: "order-demo-processing-002-demo",
          status: "processing",
          paymentMethod: "qr",
          customerName: "Dewi Kusuma",
          items: [{ productSku: "FURN-CHR-OAK", qty: 2, price: 1500000 }],
          total: 3000000,
          minutesAgo: 40,
        },
        {
          id: "order-demo-processing-003-demo",
          status: "processing",
          paymentMethod: "card",
          customerName: "Mike Ross",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 1, price: 850000 }],
          total: 850000,
          minutesAgo: 60,
        },
        {
          id: "order-demo-ready-001-demo",
          status: "ready_for_pickup",
          paymentMethod: "cash",
          customerName: "Rizal Malik",
          items: [{ productSku: "CLOTH-HOOD-GRY", qty: 2, price: 599000 }],
          total: 1198000,
          minutesAgo: 60,
        },
        {
          id: "order-demo-ready-002-demo",
          status: "ready_for_pickup",
          paymentMethod: "cash",
          customerName: "Walk-in Customer",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 5, price: 249000 }],
          total: 1245000,
          minutesAgo: 75,
        },
        {
          id: "order-demo-ready-003-demo",
          status: "ready_for_pickup",
          paymentMethod: "card",
          customerName: "Louis Litt",
          items: [{ productSku: "ELEC-IPN-015", qty: 1, price: 12500000 }],
          total: 12500000,
          minutesAgo: 150,
        },
        {
          id: "order-demo-shipped-001-demo",
          status: "shipped",
          paymentMethod: "card",
          customerName: "Hendra Wijaya",
          items: [{ productSku: "FURN-TBL-GLS", qty: 1, price: 3200000 }],
          total: 3200000,
          minutesAgo: 120,
        },
        {
          id: "order-demo-shipped-002-demo",
          status: "shipped",
          paymentMethod: "qr",
          customerName: "Lina Pratiwi",
          items: [{ productSku: "ELEC-IPN-015", qty: 2, price: 18999000 }],
          total: 37998000,
          minutesAgo: 180,
        },
        {
          id: "order-demo-shipped-003-demo",
          status: "shipped",
          paymentMethod: "card",
          customerName: "Harvey Specter",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 1, price: 550000 }],
          total: 550000,
          minutesAgo: 240,
        },
        {
          id: "order-demo-complete-001-demo",
          status: "complete",
          paymentMethod: "card",
          customerName: "Teguh Susanto",
          items: [
            { productSku: "ELEC-MBP-001", qty: 1, price: 32999000 },
            { productSku: "ELEC-IPN-015", qty: 1, price: 18999000 },
          ],
          total: 51998000,
          minutesAgo: 300,
        },
        {
          id: "order-demo-complete-002-demo",
          status: "complete",
          paymentMethod: "cash",
          customerName: "Steve Rogers",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 750000 }],
          total: 750000,
          minutesAgo: 1000,
        },
        {
          id: "order-demo-cancelled-001-demo",
          status: "cancelled",
          paymentMethod: "qr",
          customerName: "Nurul Hidayah",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 1500000 }],
          total: 1500000,
          minutesAgo: 420,
        },
        {
          id: "order-demo-refunded-001-demo",
          status: "refunded",
          paymentMethod: "card",
          customerName: "Bagas Pramono",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 2, price: 249000 }],
          total: 498000,
          minutesAgo: 500,
        },
      ];

      // Ensure a cashier exists
      let cashier = await this.prisma.employee.findFirst({
        where: { tenantId: this.TENANT_ID },
      });
      if (!cashier) {
        const deptRow = await this.prisma.department.findFirst({
          where: { tenantId: this.TENANT_ID },
        });
        let deptId = deptRow?.id;
        if (!deptId) {
          const dept = await this.prisma.department.create({
            data: {
              id: "8ggcr0m3",
              updatedAt: new Date(),
              tenantId: this.TENANT_ID,
              name: "Retail Operations",
              code: "RET-OPS",
            },
          });
          deptId = dept.id;
        }
        cashier = await this.prisma.employee.create({
          data: {
            id: "l8euqfqy",
            updatedAt: new Date(),
            tenantId: this.TENANT_ID,
            locationId: location.id,
            departmentId: deptId,
            firstName: "Demo",
            lastName: "Cashier",
            email: "cashier@demo.local",
            employeeCode: "EMP-DEMO-001",
            position: "Cashier",
            status: "active",
            employmentType: "full_time",
            hireDate: new Date().toISOString(),
          },
        });
      }

      for (const orderDef of showcaseOrders) {
        // 4a. Ensure Customer exists for the showcase
        const customerEmail = `${orderDef.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
        const customer = await this.prisma.retailCustomer.upsert({
          where: {
            tenantId_email: {
              tenantId: this.TENANT_ID,
              email: customerEmail,
            },
          },
          update: { name: orderDef.customerName },
          create: {
            tenantId: this.TENANT_ID,
            name: orderDef.customerName,
            email: customerEmail,
          },
        });

        // Skip if already exists
        const exists = await this.prisma.retailOrder.findUnique({
          where: { id: orderDef.id },
        });
        if (exists) {
          // Update status and customer to keep showcase fresh
          await this.prisma.retailOrder.update({
            where: { id: orderDef.id },
            data: {
              status: orderDef.status,
              customerId: customer.id,
            },
          });
          this.logger.log(
            `Updated order ${orderDef.id} status to ${orderDef.status}`,
          );
          continue;
        }

        const createdAt = new Date(
          Date.now() - orderDef.minutesAgo * 60 * 1000,
        );

        const subtotal = orderDef.items.reduce(
          (s, i) => s + i.price * i.qty,
          0,
        );
        const tax = Math.round(subtotal * 0.11);
        const totalAmount = subtotal + tax;

        const order = await this.prisma.retailOrder.create({
          data: {
            id: orderDef.id,
            tenantId: this.TENANT_ID,
            storeId: store.id,
            cashierId: cashier.id,
            customerId: customer.id,
            status: orderDef.status,
            subtotal,
            tax,
            totalAmount,
            paymentMethod: orderDef.paymentMethod,
            paymentReference: `REF-${orderDef.id.slice(-8).toUpperCase()}`,
            createdAt,
            updatedAt: createdAt,
          },
        });

        for (const item of orderDef.items) {
          const product = await this.prisma.itemMaster.findUnique({
            where: {
              tenantId_sku: { tenantId: this.TENANT_ID, sku: item.productSku },
            },
          });
          if (!product) {
            this.logger.warn(
              `Skip order item: No product found for SKU ${item.productSku}`,
            );
            continue;
          }
          await this.prisma.retailOrderItem.create({
            data: {
              id: "kr8b4xgx",
              
              tenantId: this.TENANT_ID,
              orderId: order.id,
              productId: product.id,
              quantity: item.qty,
              unitPrice: item.price,
              totalPrice: item.price * item.qty,
              discount: 0,
            },
          });
        }

        this.logger.log(`Seeded order ${orderDef.id} [${orderDef.status}]`);
      }

      this.logger.log("Retail seeding completed successfully.");
    } catch (error) {
      this.logger.error("Failed to seed retail data", error);
    }
  }
}
