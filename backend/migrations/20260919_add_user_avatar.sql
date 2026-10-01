-- Chỉ chạy khi DB_SYNCHRONIZE=false. Nếu đang bật đồng bộ schema, TypeORM tự thêm cột.
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(2048) NULL DEFAULT NULL;
