-- Xóa toàn bộ tài khoản admin, CHỈ GIỮ LẠI admin chính thức: admindemo@edu.vn
-- Chạy thủ công trong Supabase SQL Editor hoặc: psql $DATABASE_URL -f scripts/delete-admins-except-official.sql

DELETE FROM users
WHERE role_type = 'admin'
  AND email != 'admindemo@edu.vn';
