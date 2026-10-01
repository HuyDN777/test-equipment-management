-- Chạy một lần khi DB_SYNCHRONIZE=false. Sao lưu DB trước khi chạy.
-- DB_SYNCHRONIZE=true: TypeORM tự cập nhật schema, không chạy script này.

ALTER TABLE maintenance_records
  ADD COLUMN vendors_id varchar(36) NULL,
  ADD COLUMN planned_date date NULL,
  MODIFY COLUMN start_date date NULL;

ALTER TABLE maintenance_records
  ADD CONSTRAINT fk_maintenance_vendor FOREIGN KEY (vendors_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- Các phiếu cũ đang Pending vốn lưu ngày dự kiến trong start_date.
UPDATE maintenance_records SET planned_date = start_date, start_date = NULL WHERE status = 'Pending';

ALTER TABLE calibration_records
  ADD COLUMN planned_date date NULL,
  ADD COLUMN start_date date NULL,
  ADD COLUMN status enum('Pending', 'InProgress', 'Completed') NOT NULL DEFAULT 'Pending',
  MODIFY COLUMN calibration_date date NULL,
  MODIFY COLUMN next_due_date date NULL,
  MODIFY COLUMN result varchar(16) NULL DEFAULT NULL;

-- Phiếu hiệu chuẩn cũ đã có kết quả thì được xem là hoàn tất.
UPDATE calibration_records
SET status = 'Completed', planned_date = calibration_date, start_date = calibration_date
WHERE calibration_date IS NOT NULL AND result IS NOT NULL;

-- Khóa các máy mà lần hiệu chuẩn hoàn tất gần nhất không đạt.
UPDATE devices d
JOIN calibration_records c ON c.device_id = d.id
SET d.status = 'Maintenance'
WHERE d.status = 'Available' AND c.status = 'Completed' AND c.result <> 'Pass'
  AND NOT EXISTS (
    SELECT 1 FROM calibration_records newer
    WHERE newer.device_id = c.device_id AND newer.status = 'Completed'
      AND (newer.calibration_date > c.calibration_date
        OR (newer.calibration_date = c.calibration_date AND newer.created_at > c.created_at))
  );
