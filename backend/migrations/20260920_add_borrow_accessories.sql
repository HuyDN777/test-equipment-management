-- Chỉ chạy khi DB_SYNCHRONIZE=false. Sao lưu DB trước khi chạy trên dữ liệu thật.
ALTER TABLE borrow_requests
  ADD COLUMN issued_accessories JSON NULL,
  ADD COLUMN returned_accessories JSON NULL;
