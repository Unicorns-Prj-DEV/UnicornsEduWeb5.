-- Thêm cột student_id, staff_id vào bảng users nếu thiếu (lỗi: column users.student_id does not exist)
-- Chạy: npx prisma db execute --file scripts/fix-users-add-student-staff-id.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE users ADD COLUMN student_id TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE users ADD COLUMN staff_id TEXT;
  END IF;
END $$;

-- Thêm FK nếu chưa có (bỏ qua lỗi nếu đã tồn tại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'users' AND constraint_name = 'users_student_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES student_info(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'users' AND constraint_name = 'users_staff_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES staff_info(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index cho tra cứu
CREATE INDEX IF NOT EXISTS users_student_id_idx ON users(student_id);
CREATE INDEX IF NOT EXISTS users_staff_id_idx ON users(staff_id);
