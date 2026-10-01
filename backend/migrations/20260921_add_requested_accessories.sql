-- Run only when DB_SYNCHRONIZE=false.
ALTER TABLE borrow_requests
  ADD COLUMN requested_accessories JSON NULL;
