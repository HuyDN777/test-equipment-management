-- Chạy một lần nếu DB_SYNCHRONIZE=false. Sao lưu DB trước khi chạy.
-- Nếu DB_SYNCHRONIZE=true, khởi động lại backend và không chạy file này.

ALTER TABLE notifications
  ADD COLUMN dedupe_key varchar(180) NULL,
  ADD COLUMN is_deleted tinyint(1) NOT NULL DEFAULT 0,
  ADD UNIQUE INDEX uq_notifications_dedupe_key (dedupe_key);

ALTER TABLE notifications
  MODIFY COLUMN type enum(
    'BorrowRequestCreated',
    'BorrowRequestApproved',
    'BorrowRequestRejected',
    'BorrowRequestReturned',
    'BorrowRequestCancelled',
    'DeviceIssueReported',
    'CalibrationDue',
    'Info'
  ) NOT NULL DEFAULT 'Info';
