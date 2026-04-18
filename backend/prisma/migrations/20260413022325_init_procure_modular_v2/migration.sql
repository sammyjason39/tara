/*
  Warnings:

  - You are about to alter the column `depreciation_exp` on the `asset_depreciation_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `accumulated_dep` on the `asset_depreciation_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `carrying_value` on the `asset_depreciation_entries` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `allocated_budget` on the `capex_budgets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `committed_budget` on the `capex_budgets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `available_budget` on the `capex_budgets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `requested_amount` on the `capex_requests` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `base_salary` on the `compensations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `qty` on the `cost_layers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `DoublePrecision`.
  - You are about to alter the column `remaining_qty` on the `cost_layers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `DoublePrecision`.
  - You are about to alter the column `unit_cost` on the `cost_layers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_qty` on the `cost_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `DoublePrecision`.
  - You are about to alter the column `total_valuation` on the `cost_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `avg_unit_cost` on the `cost_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `base_salary` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `hourly_rate` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `debit_total` on the `finance_account_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `credit_total` on the `finance_account_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `net_balance` on the `finance_account_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount_allocated` on the `finance_ap_payment_allocations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `credit_amount` on the `finance_ar_credit_memos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `balance` on the `finance_ar_customer_credit_balances` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `credit_limit` on the `finance_ar_customers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `quantity` on the `finance_ar_invoice_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `unit_price` on the `finance_ar_invoice_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `total` on the `finance_ar_invoice_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `total_amount` on the `finance_ar_invoices` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `outstanding_amount` on the `finance_ar_invoices` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount_allocated` on the `finance_ar_payment_allocations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_ar_payments` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `opening_balance` on the `finance_bank_statements` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `closing_balance` on the `finance_bank_statements` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_bank_transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_budget_actuals` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_budget_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `hard_limit` on the `finance_expense_policies` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `soft_limit` on the `finance_expense_policies` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_journal_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `debit` on the `finance_journal_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `credit` on the `finance_journal_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `amount` on the `finance_ledger_posting_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `threshold` on the `finance_policies` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `rate` on the `finance_tax_rates` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(5,4)`.
  - You are about to alter the column `base_amount` on the `finance_transaction_taxes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `tax_amount` on the `finance_transaction_taxes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(19,4)`.
  - You are about to alter the column `acquisition_cost` on the `fixed_assets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `residual_value` on the `fixed_assets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `accumulated_depreciation` on the `fixed_assets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `carrying_value` on the `fixed_assets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `revaluation_reserve` on the `fixed_assets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `employer_contribution` on the `hr_benefit_plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `employee_contribution` on the `hr_benefit_plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_budget` on the `hr_budget_scenarios` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `coverage_amount` on the `hr_employee_benefits` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `rate` on the `hr_exchange_rates` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,6)`.
  - You are about to alter the column `projected_salary` on the `hr_headcount_plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to drop the column `updated_at` on the `hr_insights` table. All the data in the column will be lost.
  - You are about to alter the column `total_gross_pay` on the `hr_payroll_runs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_net_pay` on the `hr_payroll_runs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_deductions` on the `hr_payroll_runs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to drop the column `updated_at` on the `hr_recommendations` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `inventory_movement_requests` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `on_hand` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `reserved` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `available` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to drop the column `accounting_period_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `base_amount` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `base_currency` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `cost_version_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `credit_account_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `debit_account_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `exchange_rate` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `failure_type` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `gl_journal_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `inventory_transaction_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `location_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `posted_period_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `posting_request_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `reference_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `reference_type` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `sku_id` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `unit_cost` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - You are about to alter the column `base_price` on the `item_masters` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `tax_rate` on the `item_masters` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(5,2)`.
  - You are about to alter the column `base_salary_min` on the `job_roles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `base_salary_max` on the `job_roles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `revenue_attributed` on the `marketing_attribution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `spend` on the `marketing_attribution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `roi_percent` on the `marketing_attribution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(10,2)`.
  - You are about to alter the column `budget` on the `marketing_campaigns` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `spend` on the `marketing_executions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `balance` on the `money_sources` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `pending_settlement` on the `money_sources` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `payables` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `payment_chargebacks` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `payment_disputes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `max_amount_per_txn` on the `payment_providers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `payment_refunds` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `payment_transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `gross_pay` on the `payroll_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `net_pay` on the `payroll_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `adjustments` on the `payroll_lines` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `budgeted_salary` on the `positions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `quoted_total` on the `procurement_draft_pos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_amount` on the `procurement_final_pos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `procurement_requisitions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `price` on the `product_projections` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `receivables` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `quantity` on the `retail_cart_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `unit_price` on the `retail_cart_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `unit_price` on the `retail_order_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_price` on the `retail_order_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `discount` on the `retail_order_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `subtotal` on the `retail_orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `tax` on the `retail_orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `total_amount` on the `retail_orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `value` on the `retail_promotions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `opening_cash` on the `retail_shifts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `closing_cash` on the `retail_shifts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `expected_cash` on the `retail_shifts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `potential_value` on the `sales_leads` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `sales_opportunities` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `sales_orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `sales_quotes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `discount_percent` on the `sales_quotes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(5,2)`.
  - You are about to alter the column `net_amount` on the `sales_quotes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `settlement_records` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `quantity` on the `stock_reservations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `reserved` on the `stock_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `available` on the `stock_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `inTransit` on the `stock_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `onHand` on the `stock_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,4)` to `DoublePrecision`.
  - You are about to alter the column `unit_price` on the `supplier_products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to alter the column `amount` on the `treasury_transfers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,2)` to `Decimal(15,2)`.
  - You are about to drop the `customer_credit_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_subledger_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ledger_event_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProcurementMode" AS ENUM ('DIRECT', 'BIDDING');

-- DropForeignKey
ALTER TABLE "finance_subledger_entries" DROP CONSTRAINT "finance_subledger_entries_tenant_id_fkey";

-- AlterTable
ALTER TABLE "accounting_periods" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "admin_module_statuses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "admin_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "asset_depreciation_entries" ALTER COLUMN "depreciation_exp" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "accumulated_dep" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "carrying_value" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "bulletin_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bulletin_posts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "candidates" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "capex_budgets" ALTER COLUMN "allocated_budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "committed_budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "available_budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "capex_requests" ALTER COLUMN "requested_amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_rooms" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "compensations" ALTER COLUMN "base_salary" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cost_layers" ALTER COLUMN "qty" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "remaining_qty" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "cost_snapshots" ALTER COLUMN "total_qty" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total_valuation" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "avg_unit_cost" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ecommerce_connectors" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "emergency_overrides" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "base_salary" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "hourly_rate" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "event_deliveries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_account_balances" ALTER COLUMN "debit_total" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "credit_total" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "net_balance" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ap_payment_allocations" ALTER COLUMN "amount_allocated" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_ar_credit_memos" ALTER COLUMN "credit_amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ar_customer_credit_balances" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ar_customers" ALTER COLUMN "credit_limit" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ar_invoice_lines" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_ar_invoices" ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "outstanding_amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ar_payment_allocations" ALTER COLUMN "amount_allocated" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_ar_payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_bank_statements" ALTER COLUMN "opening_balance" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "closing_balance" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_bank_transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_budget_actuals" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_budget_lines" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_chart_of_accounts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_expense_policies" ALTER COLUMN "hard_limit" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "soft_limit" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_fiscal_periods" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_journal_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_journal_lines" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "debit" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "credit" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_ledger_posting_lines" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "finance_ledger_posting_rule_lines" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ledger_posting_rules" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_ledger_postings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_policies" ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_tax_rates" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(5,4);

-- AlterTable
ALTER TABLE "finance_transaction_taxes" ALTER COLUMN "base_amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "tax_amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "fixed_assets" ALTER COLUMN "acquisition_cost" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "residual_value" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "accumulated_depreciation" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "carrying_value" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "revaluation_reserve" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_attendance_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_benefit_plans" ALTER COLUMN "employer_contribution" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "employee_contribution" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_budget_scenarios" ALTER COLUMN "total_budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_career_paths" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_cases" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_compliance_documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_compliance_modules" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_compliance_reports" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_employee_benefits" ALTER COLUMN "coverage_amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_employee_skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_exchange_rates" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(15,6),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_headcount_plans" ALTER COLUMN "projected_salary" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_holidays" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_insights" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "hr_mentorship_pairs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_payroll_runs" ALTER COLUMN "total_gross_pay" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "total_net_pay" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "total_deductions" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_performance_cycles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_performance_goals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_position_skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_program_skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_recommendations" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "hr_skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_succession_candidates" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_succession_plans" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_talent_leads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_work_schedules" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr_work_shifts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "interviews" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_adjustments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_alerts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_audit_cycles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_integration_events" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_movement_requests" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_pool_stock" ALTER COLUMN "on_hand" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "reserved" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "available" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_pools" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_subledger_entries" DROP COLUMN "accounting_period_id",
DROP COLUMN "amount",
DROP COLUMN "base_amount",
DROP COLUMN "base_currency",
DROP COLUMN "cost_version_id",
DROP COLUMN "credit_account_id",
DROP COLUMN "currency",
DROP COLUMN "debit_account_id",
DROP COLUMN "exchange_rate",
DROP COLUMN "failure_type",
DROP COLUMN "gl_journal_id",
DROP COLUMN "inventory_transaction_id",
DROP COLUMN "location_id",
DROP COLUMN "posted_period_id",
DROP COLUMN "posting_request_id",
DROP COLUMN "qty",
DROP COLUMN "reference_id",
DROP COLUMN "reference_type",
DROP COLUMN "sku_id",
DROP COLUMN "unit_cost",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "it_provisioning_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "it_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "item_masters" ALTER COLUMN "base_price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "tax_rate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_requisitions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_roles" ALTER COLUMN "base_salary_min" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "base_salary_max" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "label_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mail_accounts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mail_threads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_accounts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_alerts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_attribution" ALTER COLUMN "revenue_attributed" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "spend" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "roi_percent" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "marketing_campaigns" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_executions" ALTER COLUMN "spend" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_leads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing_workflows" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "module_definitions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "module_licenses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "money_sources" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "pending_settlement" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "payables" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_chargebacks" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_device_pools" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_disputes" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_pos_devices" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_providers" ALTER COLUMN "max_amount_per_txn" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_refunds" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_routing_policies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_settlements" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payroll_lines" ALTER COLUMN "gross_pay" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "net_pay" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "adjustments" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payroll_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "performance_reviews" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pos_devices" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "positions" ALTER COLUMN "budgeted_salary" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_contracts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_draft_pos" ALTER COLUMN "quoted_total" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_final_pos" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_requisitions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_risk_signals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_projections" ALTER COLUMN "price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "receivables" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_cart_items" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_carts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_channels" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_customer_auth" ALTER COLUMN "password_updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_customer_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_customers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_load_balancers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_order_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "total_price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "retail_orders" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_promotions" ALTER COLUMN "value" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_shifts" ALTER COLUMN "opening_cash" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "closing_cash" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "expected_cash" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_wishlist_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retail_wishlists" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_alerts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_leads" ALTER COLUMN "potential_value" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_opportunities" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_orders" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_quotes" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "discount_percent" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "net_amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_tasks" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "schedule_assignments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "settlement_records" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shift_swap_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shifts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_levels" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_reservations" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_snapshots" ALTER COLUMN "reserved" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "available" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "inTransit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "onHand" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "stores" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_branches" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_masters" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_products" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sys_outbox_events" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "training_assignments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "training_programs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "treasury_transfers" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_companies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_audit_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_definitions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_instances" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "customer_credit_balances";

-- DropTable
DROP TABLE "finance_subledger_entries";

-- DropTable
DROP TABLE "ledger_event_logs";

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "procurement_mode" "ProcurementMode" NOT NULL DEFAULT 'DIRECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_sourcing_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT,
    "final_po_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "bid_deadline" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_sourcing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_recipes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_cost" DECIMAL(15,2) NOT NULL,
    "suggested_price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_ingredients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "fnb_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farming_sensor_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "farming_sensor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_settings_tenant_id_idx" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_sourcing_events_requisition_id_idx" ON "procurement_sourcing_events"("requisition_id");

-- CreateIndex
CREATE INDEX "procurement_sourcing_events_tenant_id_idx" ON "procurement_sourcing_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_tenant_id_idx" ON "idempotency_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_tenant_id_key_endpoint_key" ON "idempotency_keys"("tenant_id", "key", "endpoint");

-- CreateIndex
CREATE INDEX "fnb_recipes_tenant_id_idx" ON "fnb_recipes"("tenant_id");

-- CreateIndex
CREATE INDEX "fnb_ingredients_tenant_id_recipe_id_idx" ON "fnb_ingredients"("tenant_id", "recipe_id");

-- CreateIndex
CREATE INDEX "farming_sensor_logs_tenant_id_sensor_id_timestamp_idx" ON "farming_sensor_logs"("tenant_id", "sensor_id", "timestamp");

-- CreateIndex
CREATE INDEX "clinic_reservations_tenant_id_patient_id_idx" ON "clinic_reservations"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "clinic_reservations_tenant_id_resource_id_start_time_idx" ON "clinic_reservations"("tenant_id", "resource_id", "start_time");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_final_po_id_fkey" FOREIGN KEY ("final_po_id") REFERENCES "procurement_final_pos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_recipes" ADD CONSTRAINT "fnb_recipes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_ingredients" ADD CONSTRAINT "fnb_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "fnb_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_ingredients" ADD CONSTRAINT "fnb_ingredients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farming_sensor_logs" ADD CONSTRAINT "farming_sensor_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_reservations" ADD CONSTRAINT "clinic_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
