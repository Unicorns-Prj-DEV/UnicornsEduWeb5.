-- AlterTable
ALTER TABLE "student_wallet_direct_topup_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_wallet_sepay_orders" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "makeup_schedule_events_class_id_baseline_schedule_entry_id_orig" RENAME TO "makeup_schedule_events_class_id_baseline_schedule_entry_id__idx";
