-- CreateTable
CREATE TABLE "leave_balance_adjustments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days_delta" DECIMAL(8,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_balance_adjustments_employee_id_idx" ON "leave_balance_adjustments"("employee_id");

-- CreateIndex
CREATE INDEX "leave_balance_adjustments_created_at_idx" ON "leave_balance_adjustments"("created_at");

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
