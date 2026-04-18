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
      let company = await this.prisma.companies.findUnique({
        where: { id: this.TENANT_ID },
      });

      if (true /* RECOVERY */) {
        this.logger.log("Creating default company...");
        company = await this.prisma.companies.create({
          data: {
            id: this.TENANT_ID,
            name: "Zenvix Demo Corp",
            code: "ZDX",
            industry: "retail",
            updated_at: new Date(),
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
        await this.prisma.admin_module_statuses.upsert({
          where: {
            tenant_id_module_key: {
              tenant_id: this.TENANT_ID,
              module_key: moduleKey,
            },
          },
          update: { enabled: true, updated_by: "system" },
          create: {
            id: uuidv4(),
            tenant_id: this.TENANT_ID,
            module_key: moduleKey,
            enabled: true,
            updated_by: "system",
          },
        });
      }
      this.logger.log(
        `Enabled ${moduleKeysToEnable.length} module keys for tenant ${this.TENANT_ID}`,
      );

      let location = await this.prisma.locations.findFirst({
        where: { tenant_id: this.TENANT_ID, type: "branch" },
      });

      if (true /* RECOVERY */) {
        this.logger.log("Creating default branch location...");
        location = await this.prisma.locations.create({
          data: {
            id: "42txt9cs",
            updated_at: new Date(),
            tenant_id: this.TENANT_ID,
            name: "Grand Indonesia Flagship",
            code: "GI-001",
            type: "branch",
            currency: "IDR",
          },
        });
      }

      let store = await this.prisma.stores.findFirst({
        where: { tenant_id: this.TENANT_ID },
      });

      if (true /* RECOVERY */) {
        this.logger.log("Creating default store...");
        store = await this.prisma.stores.create({
          data: {
            id: "u62hbe93",
            updated_at: new Date(),
            tenant_id: this.TENANT_ID,
            location_id: location.id,
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
      const electronicsCat = await this.prisma.product_categories.upsert({
        where: {
          tenant_id_name: { tenant_id: this.TENANT_ID, name: "Electronics" },
        },
        update: {},
        create: {
          id: uuidv4(),
          tenant_id: this.TENANT_ID,
          name: "Electronics",
        },
      });

      const clothingCat = await this.prisma.product_categories.upsert({
        where: {
          tenant_id_name: { tenant_id: this.TENANT_ID, name: "Clothing" },
        },
        update: {},
        create: {
          id: uuidv4(),
          tenant_id: this.TENANT_ID,
          name: "Clothing",
        },
      });

      const furnitureCat = await this.prisma.product_categories.upsert({
        where: {
          tenant_id_name: { tenant_id: this.TENANT_ID, name: "Furniture" },
        },
        update: {},
        create: {
          id: uuidv4(),
          tenant_id: this.TENANT_ID,
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
          category_id: electronicsCat.id,
          base_price: 32999000,
          barcode: "888123456789",
          unit: "PCS",
          stock: 15,
        },
        {
          id: "prod-002-demo",
          sku: "ELEC-IPN-015",
          name: "iPhone 15 Pro",
          description: "Stronger than ever",
          category_id: electronicsCat.id,
          base_price: 18999000,
          barcode: "888987654321",
          unit: "PCS",
          stock: 42,
        },
        {
          id: "prod-003-demo",
          sku: "CLOTH-TEE-BLK",
          name: "Minimalist Black Tee",
          description: "100% Cotton",
          category_id: clothingCat.id,
          base_price: 249000,
          barcode: "111222333444",
          unit: "PCS",
          stock: 120,
        },
        {
          id: "prod-004-demo",
          sku: "CLOTH-HOOD-GRY",
          name: "Essential Hoodie",
          description: "Premium fleece",
          category_id: clothingCat.id,
          base_price: 599000,
          barcode: "111222333445",
          unit: "PCS",
          stock: 45,
        },
        {
          id: "prod-005-demo",
          sku: "FURN-CHR-OAK",
          name: "Oak Dining Chair",
          description: "Solid oak wood",
          category_id: furnitureCat.id,
          base_price: 1500000,
          barcode: "555666777888",
          unit: "PCS",
          stock: 24,
        },
        {
          id: "prod-006-demo",
          sku: "FURN-TBL-GLS",
          name: "Glass Coffee Table",
          description: "Tempered glass top",
          category_id: furnitureCat.id,
          base_price: 3200000,
          barcode: "555666777889",
          unit: "PCS",
          stock: 8,
        },
      ];

      for (const prodData of productsData) {
        const product = await this.prisma.item_masters.upsert({
          where: {
            tenant_id_sku: { tenant_id: this.TENANT_ID, sku: prodData.sku },
          },
          update: {
            sku: prodData.sku,
            name: prodData.name,
            description: prodData.description,
            category_id: prodData.category_id,
            base_price: prodData.base_price,
            barcode: prodData.barcode,
          },
          create: {
            id: prodData.id,
            tenant_id: this.TENANT_ID,
            sku: prodData.sku,
            name: prodData.name,
            description: prodData.description,
            category_id: prodData.category_id,
            base_price: prodData.base_price,
            barcode: prodData.barcode,
            unit: prodData.unit,
            type: "ITEM",
            status: "active",
            tax_rate: 11,
          },
        });

        const stockLevel = await this.prisma.stock_levels.findFirst({
          where: { location_id: location.id, product_id: product.id },
        });
        if (stockLevel) {
          await this.prisma.stock_levels.update({
            where: { id: stockLevel.id },
            data: { on_hand: prodData.stock, available: prodData.stock },
          });
        } else {
          await this.prisma.stock_levels.create({
            data: {
              id: "fsgavby6",
              updated_at: new Date(),
              tenant_id: this.TENANT_ID,
              location_id: location.id,
              product_id: product.id,
              on_hand: prodData.stock,
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
          payment_method: "card",
          customerName: "Budi Santoso",
          items: [{ productSku: "ELEC-IPN-015", qty: 1, price: 18999000 }],
          total: 18999000,
          minutesAgo: 5,
        },
        {
          id: "order-demo-paid-002-demo",
          status: "paid",
          payment_method: "qr",
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
          payment_method: "card",
          customerName: "John Doe",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 2, price: 150000 }],
          total: 300000,
          minutesAgo: 30,
        },
        {
          id: "order-demo-paid-004-demo",
          status: "paid",
          payment_method: "cash",
          customerName: "Alice Wonderland",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 1500000 }],
          total: 1500000,
          minutesAgo: 15,
        },
        {
          id: "order-demo-processing-001-demo",
          status: "processing",
          payment_method: "card",
          customerName: "Ahmad Fauzi",
          items: [{ productSku: "ELEC-MBP-001", qty: 1, price: 32999000 }],
          total: 32999000,
          minutesAgo: 25,
        },
        {
          id: "order-demo-processing-002-demo",
          status: "processing",
          payment_method: "qr",
          customerName: "Dewi Kusuma",
          items: [{ productSku: "FURN-CHR-OAK", qty: 2, price: 1500000 }],
          total: 3000000,
          minutesAgo: 40,
        },
        {
          id: "order-demo-processing-003-demo",
          status: "processing",
          payment_method: "card",
          customerName: "Mike Ross",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 1, price: 850000 }],
          total: 850000,
          minutesAgo: 60,
        },
        {
          id: "order-demo-ready-001-demo",
          status: "ready_for_pickup",
          payment_method: "cash",
          customerName: "Rizal Malik",
          items: [{ productSku: "CLOTH-HOOD-GRY", qty: 2, price: 599000 }],
          total: 1198000,
          minutesAgo: 60,
        },
        {
          id: "order-demo-ready-002-demo",
          status: "ready_for_pickup",
          payment_method: "cash",
          customerName: "Walk-in Customer",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 5, price: 249000 }],
          total: 1245000,
          minutesAgo: 75,
        },
        {
          id: "order-demo-ready-003-demo",
          status: "ready_for_pickup",
          payment_method: "card",
          customerName: "Louis Litt",
          items: [{ productSku: "ELEC-IPN-015", qty: 1, price: 12500000 }],
          total: 12500000,
          minutesAgo: 150,
        },
        {
          id: "order-demo-shipped-001-demo",
          status: "shipped",
          payment_method: "card",
          customerName: "Hendra Wijaya",
          items: [{ productSku: "FURN-TBL-GLS", qty: 1, price: 3200000 }],
          total: 3200000,
          minutesAgo: 120,
        },
        {
          id: "order-demo-shipped-002-demo",
          status: "shipped",
          payment_method: "qr",
          customerName: "Lina Pratiwi",
          items: [{ productSku: "ELEC-IPN-015", qty: 2, price: 18999000 }],
          total: 37998000,
          minutesAgo: 180,
        },
        {
          id: "order-demo-shipped-003-demo",
          status: "shipped",
          payment_method: "card",
          customerName: "Harvey Specter",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 1, price: 550000 }],
          total: 550000,
          minutesAgo: 240,
        },
        {
          id: "order-demo-complete-001-demo",
          status: "complete",
          payment_method: "card",
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
          payment_method: "cash",
          customerName: "Steve Rogers",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 750000 }],
          total: 750000,
          minutesAgo: 1000,
        },
        {
          id: "order-demo-cancelled-001-demo",
          status: "cancelled",
          payment_method: "qr",
          customerName: "Nurul Hidayah",
          items: [{ productSku: "FURN-CHR-OAK", qty: 1, price: 1500000 }],
          total: 1500000,
          minutesAgo: 420,
        },
        {
          id: "order-demo-refunded-001-demo",
          status: "refunded",
          payment_method: "card",
          customerName: "Bagas Pramono",
          items: [{ productSku: "CLOTH-TEE-BLK", qty: 2, price: 249000 }],
          total: 498000,
          minutesAgo: 500,
        },
      ];

      // Ensure a cashier exists
      let cashier = await this.prisma.employees.findFirst({
        where: { tenant_id: this.TENANT_ID },
      });
      if (!cashier) {
        const deptRow = await this.prisma.departments.findFirst({
          where: { tenant_id: this.TENANT_ID },
        });
        let deptId = deptRow?.id;
        if (!deptId) {
          const dept = await this.prisma.departments.create({
            data: {
              id: "8ggcr0m3",
              updated_at: new Date(),
              tenant_id: this.TENANT_ID,
              name: "Retail Operations",
              code: "RET-OPS",
            },
          });
          deptId = dept.id;
        }
        cashier = await this.prisma.employees.create({
          data: {
            id: "l8euqfqy",
            updated_at: new Date(),
            tenant_id: this.TENANT_ID,
            location_id: location.id,
            department_id: deptId,
            first_name: "Demo",
            last_name: "Cashier",
            email: "cashier@demo.local",
            employee_code: "EMP-DEMO-001",
            position: "Cashier",
            status: "active",
            employment_type: "full_time",
            hire_date: new Date().toISOString(),
          },
        });
      }

      for (const orderDef of showcaseOrders) {
        // 4a. Ensure Customer exists for the showcase
        const customerEmail = `${orderDef.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
        const customer = await this.prisma.retail_customers.upsert({
          where: {
            tenant_id_email: {
              tenant_id: this.TENANT_ID,
              email: customerEmail,
            },
          },
          update: { name: orderDef.customerName },
          create: {
            id: uuidv4(),
            tenant_id: this.TENANT_ID,
            name: orderDef.customerName,
            email: customerEmail,
          },
        });

        // Skip if already exists
        const exists = await this.prisma.retail_orders.findUnique({
          where: { id: orderDef.id },
        });
        if (exists) {
          // Update status and customer to keep showcase fresh
          await this.prisma.retail_orders.update({
            where: { id: orderDef.id },
            data: {
              status: orderDef.status,
              customer_id: customer.id,
            },
          });
          this.logger.log(
            `Updated order ${orderDef.id} status to ${orderDef.status}`,
          );
          continue;
        }

        const created_at = new Date(
          Date.now() - orderDef.minutesAgo * 60 * 1000,
        );

        const subtotal = orderDef.items.reduce(
          (s, i) => s + i.price * i.qty,
          0,
        );
        const tax = Math.round(subtotal * 0.11);
        const total_amount = subtotal + tax;

        const order = await this.prisma.retail_orders.create({
          data: {
            id: orderDef.id,
            tenant_id: this.TENANT_ID,
            store_id: stores.id,
            cashier_id: cashier.id,
            customer_id: customer.id,
            status: orderDef.status,
            subtotal,
            tax,
            total_amount: total_amount,
            payment_method: orderDef.payment_method,
            payment_reference: `REF-${orderDef.id.slice(-8).toUpperCase()}`,
            created_at: created_at,
            updated_at: created_at,
          },
        });

        for (const item of orderDef.items) {
          const product = await this.prisma.item_masters.findUnique({
            where: {
              tenant_id_sku: { tenant_id: this.TENANT_ID, sku: item.productSku },
            },
          });
          if (!product) {
            this.logger.warn(
              `Skip order item: No product found for SKU ${item.productSku}`,
            );
            continue;
          }
          await this.prisma.retail_order_items.create({
            data: {
              id: uuidv4(),
              tenant_id: this.TENANT_ID,
              order_id: order.id,
              product_id: product.id,
              quantity: item.qty,
              unit_price: item.price,
              total_price: item.price * item.qty,
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
