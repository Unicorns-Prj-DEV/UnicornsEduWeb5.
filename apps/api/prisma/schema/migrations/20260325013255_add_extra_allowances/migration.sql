-- CreateTable
CREATE TABLE "extra_allowances" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "month" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "role_type" "UserRole" NOT NULL DEFAULT 'staff',

    CONSTRAINT "extra_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extra_allowances_role_type_idx" ON "extra_allowances"("role_type");

-- CreateIndex
CREATE INDEX "extra_allowances_staff_id_idx" ON "extra_allowances"("staff_id");

-- CreateIndex
CREATE INDEX "extra_allowances_month_idx" ON "extra_allowances"("month");

-- AddForeignKey
ALTER TABLE "extra_allowances" ADD CONSTRAINT "extra_allowances_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
