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

      if (!company) {
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
      const moduleKeysToEnable = [
        "retail", "finance", "hr", "it", "it-settings", "settings",
        "admin", "procurement", "sales", "inventory", "marketing", "payment",
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
            updated_at: new Date(),
          },
        });
      }

      let location = await this.prisma.locations.findFirst({
        where: { tenant_id: this.TENANT_ID, type: "branch" },
      });

      if (!location) {
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

      if (!store) {
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

      // 1.3 Ensure Department exists for employees
      let dept = await this.prisma.departments.findFirst({
        where: { tenant_id: this.TENANT_ID },
      });
      if (!dept) {
        dept = await this.prisma.departments.create({
          data: {
            id: "dept-sales-01",
            tenant_id: this.TENANT_ID,
            name: "Sales & Retail",
            code: "SALES",
            updated_at: new Date(),
          }
        });
      }

      // 2. Categories
      const electronicsCat = await this.prisma.product_categories.upsert({
        where: {
          tenant_id_name: { tenant_id: this.TENANT_ID, name: "Electronics" },
        },
        update: {},
        create: {
          id: uuidv4(),
          tenant_id: this.TENANT_ID,
          name: "Electronics",
          updated_at: new Date(),
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
          updated_at: new Date(),
        },
      });

      // 3. Products
      const productsData = [
        { id: "prod-001-demo", sku: "ELEC-MBP-001", name: "MacBook Pro 14 M3", cat_id: electronicsCat.id, price: 32999000, barcode: "888123456789", stock: 15 },
        { id: "prod-002-demo", sku: "ELEC-IPN-015", name: "iPhone 15 Pro", cat_id: electronicsCat.id, price: 18999000, barcode: "888987654321", stock: 42 },
        { id: "prod-003-demo", sku: "CLOTH-TEE-BLK", name: "Minimalist Black Tee", cat_id: clothingCat.id, price: 249000, barcode: "111222333444", stock: 120 },
      ];

      for (const p of productsData) {
        await this.prisma.item_masters.upsert({
          where: { tenant_id_sku: { tenant_id: this.TENANT_ID, sku: p.sku } },
          update: { base_price: p.price, updated_at: new Date() },
          create: {
            id: p.id,
            tenant_id: this.TENANT_ID,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            category_id: p.cat_id,
            base_price: p.price,
            unit: "PCS",
            updated_at: new Date(),
          },
        });
      }

      // 4. Employees / Cashiers
      const cashier = await this.prisma.employees.upsert({
        where: { id: "emp-cashier-01" },
        update: {},
        create: {
          id: "emp-cashier-01",
          tenant_id: this.TENANT_ID,
          location_id: location.id,
          department_id: dept.id,
          first_name: "Andi",
          last_name: "Cashier",
          email: "cashier.demo@zenvix.id",
          position: "Sales Associate",
          employee_code: "EMP-C-01",
          hire_date: new Date(),
          status: "active",
          updated_at: new Date(),
        },
      });

      // 5. Customers
      const customer = await this.prisma.retail_customers.upsert({
        where: { tenant_id_email: { tenant_id: this.TENANT_ID, email: "johan.buyer@gmail.com" } },
        update: {},
        create: {
          id: "cust-demo-01",
          tenant_id: this.TENANT_ID,
          name: "Johan Buyer",
          email: "johan.buyer@gmail.com",
          updated_at: new Date(),
        },
      });

      // 6. Orders
      const orderDefs = [
        { id: "ord-test-01", status: "paid", payment_method: "CASH", items: [{ sku: "ELEC-MBP-001", qty: 1, price: 32999000 }] },
        { id: "ord-test-02", status: "paid", payment_method: "QRIS", items: [{ sku: "CLOTH-TEE-BLK", qty: 2, price: 249000 }] },
      ];

      for (const orderDef of orderDefs) {
        const created_at = new Date();
        const subtotal = orderDef.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const tax = Math.round(subtotal * 0.11);
        const total_amount = subtotal + tax;

        const order = await this.prisma.retail_orders.create({
          data: {
            id: orderDef.id,
            tenant_id: this.TENANT_ID,
            store_id: store.id,
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
            where: { tenant_id_sku: { tenant_id: this.TENANT_ID, sku: item.sku } },
          });
          if (product) {
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
        }
      }

      this.logger.log("Retail seeding completed successfully.");
    } catch (error) {
      this.logger.error("Failed to seed retail data", error);
    }
  }
}
