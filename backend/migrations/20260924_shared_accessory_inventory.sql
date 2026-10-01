-- Shared accessory inventory. Legacy per-device rows in `accessories` are kept for rollback/audit.
-- Run this file ONCE after taking a database backup.
-- DB_SYNCHRONIZE=true only creates the new tables; it does not move existing rows,
-- therefore the backfill below is still required for a database that already has accessories.
CREATE TABLE IF NOT EXISTS `accessory_stocks` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `total_quantity` int NOT NULL DEFAULT 0,
  `available_quantity` int NOT NULL DEFAULT 0,
  `is_deleted` tinyint NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accessory_stocks_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `accessory_stock_models` (
  `accessory_stock_id` varchar(36) NOT NULL,
  `device_model_id` varchar(36) NOT NULL,
  PRIMARY KEY (`accessory_stock_id`, `device_model_id`),
  KEY `idx_accessory_stock_models_model` (`device_model_id`),
  CONSTRAINT `fk_accessory_stock_models_stock`
    FOREIGN KEY (`accessory_stock_id`) REFERENCES `accessory_stocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_accessory_stock_models_model`
    FOREIGN KEY (`device_model_id`) REFERENCES `device_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing shared stock is deliberately preserved, so this is safe if a previous
-- partial import has already created a stock item with the same name.
INSERT IGNORE INTO `accessory_stocks`
  (`id`, `name`, `total_quantity`, `available_quantity`, `is_deleted`)
SELECT UUID(), MIN(TRIM(a.`name`)), SUM(a.`quantity`), SUM(a.`quantity`), 0
FROM `accessories` a
INNER JOIN `devices` d ON d.`id` = a.`device_id`
WHERE d.`is_deleted` = 0
GROUP BY LOWER(TRIM(a.`name`));

INSERT IGNORE INTO `accessory_stock_models` (`accessory_stock_id`, `device_model_id`)
SELECT DISTINCT stock.`id`, d.`device_model_id`
FROM `accessories` a
INNER JOIN `devices` d ON d.`id` = a.`device_id`
INNER JOIN `accessory_stocks` stock ON LOWER(stock.`name`) = LOWER(TRIM(a.`name`))
WHERE d.`is_deleted` = 0 AND d.`device_model_id` IS NOT NULL;

-- Convert active request snapshots from legacy per-device accessory ids to shared-stock ids.
UPDATE `borrow_requests` b
SET b.`requested_accessories` = (
  SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'accessory_id', stock.`id`,
    'name', COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(requested_item.`item`, '$.name')),
      JSON_UNQUOTE(requested_item.`item`)
    ),
    'quantity', COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(requested_item.`item`, '$.quantity')) AS UNSIGNED), 1)
  ))
  FROM JSON_TABLE(
    b.`requested_accessories`, '$[*]' COLUMNS (
      `item` JSON PATH '$'
    )
  ) requested_item
  INNER JOIN `accessory_stocks` stock
    ON LOWER(stock.`name`) = LOWER(TRIM(COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(requested_item.`item`, '$.name')),
      JSON_UNQUOTE(requested_item.`item`)
    )))
)
WHERE b.`requested_accessories` IS NOT NULL
  AND JSON_LENGTH(b.`requested_accessories`) > 0
  AND b.`status` IN ('Pending', 'Approved', 'ReturnPending');

UPDATE `borrow_requests` b
SET b.`issued_accessories` = (
  SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'accessory_id', stock.`id`,
    'name', COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.name')),
      JSON_UNQUOTE(issued_item.`item`)
    ),
    'quantity', COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.quantity')) AS UNSIGNED), 1)
  ))
  FROM JSON_TABLE(
    b.`issued_accessories`, '$[*]' COLUMNS (
      `item` JSON PATH '$'
    )
  ) issued_item
  INNER JOIN `accessory_stocks` stock
    ON LOWER(stock.`name`) = LOWER(TRIM(COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.name')),
      JSON_UNQUOTE(issued_item.`item`)
    )))
)
WHERE b.`issued_accessories` IS NOT NULL
  AND JSON_LENGTH(b.`issued_accessories`) > 0
  AND b.`status` IN ('Approved', 'ReturnPending');

UPDATE `accessory_stocks` stock
LEFT JOIN (
  SELECT
    LOWER(TRIM(COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.name')),
      JSON_UNQUOTE(issued_item.`item`)
    ))) AS `stock_name`,
    SUM(COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.quantity')) AS UNSIGNED), 1)) AS `issued_quantity`
  FROM `borrow_requests` b
  INNER JOIN JSON_TABLE(
    b.`issued_accessories`, '$[*]' COLUMNS (
      `item` JSON PATH '$'
    )
  ) issued_item
  WHERE b.`status` IN ('Approved', 'ReturnPending')
  GROUP BY LOWER(TRIM(COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(issued_item.`item`, '$.name')),
    JSON_UNQUOTE(issued_item.`item`)
  )))
) active_issue ON active_issue.`stock_name` = LOWER(stock.`name`)
SET stock.`available_quantity` = GREATEST(0, stock.`total_quantity` - COALESCE(active_issue.`issued_quantity`, 0));
