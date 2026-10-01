-- Chỉ dùng khi DB_SYNCHRONIZE=true: khởi động lại backend để TypeORM thêm cột,
-- sau đó chạy các câu UPDATE này một lần. Không chạy phần ALTER của file
-- 20260922_maintenance_workflow.sql trong trường hợp này.
-- Sao lưu dữ liệu trước khi chạy.

UPDATE maintenance_records
SET planned_date = start_date, start_date = NULL
WHERE status = 'Pending' AND start_date IS NOT NULL;

UPDATE calibration_records
SET status = 'Completed', planned_date = calibration_date, start_date = calibration_date
WHERE status = 'Pending' AND calibration_date IS NOT NULL AND result IS NOT NULL;

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
