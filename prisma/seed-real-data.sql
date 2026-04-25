-- ============================================================
-- CYFoods real-data seed (purchases only, no sales yet)
-- Idempotent: TRUNCATE then INSERT.
-- Preserves the users table (login accounts unchanged).
-- ============================================================

BEGIN;

-- 1. Wipe transactional tables. CASCADE handles the FK from audit_logs
--    to users (users itself is NOT in the list, so it survives).
TRUNCATE TABLE
  audit_logs,
  payments,
  sale_items,
  sales,
  packed_products,
  packing_sessions,
  quality_checks,
  purchases,
  suppliers,
  customers,
  stock_levels,
  keg_assets,
  bottle_pricing,
  supplier_price_quotes,
  market_prices
RESTART IDENTITY CASCADE;

-- 2. Suppliers
INSERT INTO suppliers (id, name, "createdAt", "updatedAt") VALUES
  ('sup_unspec_001', 'Unspecified Supplier', NOW(), NOW()),
  ('sup_prime_001',  'Prime Foods',          NOW(), NOW());

-- 3. Purchases (all ACCEPTED).
--    totalCost = kegs * pricePerKeg + transportCost
--    transportCost = kegs * logisticsPerKeg
--    costPerLitre  = totalCost / (kegs * kegSizeLitres)
INSERT INTO purchases
  (id, "supplierId", date, kegs, "kegSizeLitres", "pricePerKeg",
   "transportCost", "totalCost", "costPerLitre", status,
   "receivedAt", "createdAt", "updatedAt")
VALUES
  -- 2026-01-19  Unspecified  5 kegs @ 60,000   total 300,000   cost/L 2,400
  ('p_2026_01_19', 'sup_unspec_001', '2026-01-19 09:00:00',  5, 25,
   60000, 0,  300000, 2400.00, 'ACCEPTED',
   '2026-01-19 12:00:00', NOW(), NOW()),

  -- 2026-02-10  Unspecified  7 kegs @ 45,000   total 315,000   cost/L 1,800
  --   (source said "47k each" but stated total 315k => 45k; trusted total)
  ('p_2026_02_10', 'sup_unspec_001', '2026-02-10 09:00:00',  7, 25,
   45000, 0,  315000, 1800.00, 'ACCEPTED',
   '2026-02-10 12:00:00', NOW(), NOW()),

  -- 2026-02-11  Unspecified  10 kegs @ 48,000  total 480,000   cost/L 1,920
  ('p_2026_02_11', 'sup_unspec_001', '2026-02-11 09:00:00', 10, 25,
   48000, 0,  480000, 1920.00, 'ACCEPTED',
   '2026-02-11 12:00:00', NOW(), NOW()),

  -- 2026-02-16  Unspecified  20 kegs @ 41,500  +4k/keg logistics
  --   subtotal 830,000 + transport 80,000 = 910,000   cost/L 1,820
  ('p_2026_02_16', 'sup_unspec_001', '2026-02-16 09:00:00', 20, 25,
   41500, 80000,  910000, 1820.00, 'ACCEPTED',
   '2026-02-16 12:00:00', NOW(), NOW()),

  -- 2026-03-17  Prime Foods  5 kegs @ 50,500   total 252,500   cost/L 2,020
  ('p_2026_03_17', 'sup_prime_001',  '2026-03-17 09:00:00',  5, 25,
   50500, 0,  252500, 2020.00, 'ACCEPTED',
   '2026-03-17 12:00:00', NOW(), NOW()),

  -- 2026-03-19  Prime Foods  10 kegs @ 41,500  +6k/keg logistics
  --   subtotal 415,000 + transport 60,000 = 475,000   cost/L 1,900
  ('p_2026_03_19', 'sup_prime_001',  '2026-03-19 09:00:00', 10, 25,
   41500, 60000,  475000, 1900.00, 'ACCEPTED',
   '2026-03-19 12:00:00', NOW(), NOW());

-- 4. Quality checks (all passing — backfilled).
INSERT INTO quality_checks
  (id, "purchaseId", "colourPass", "smellPass", "tastePass", "waterPass",
   result, note, "checkedAt")
VALUES
  ('qc_p_2026_01_19', 'p_2026_01_19', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-01-19 13:00:00'),
  ('qc_p_2026_02_10', 'p_2026_02_10', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-02-10 13:00:00'),
  ('qc_p_2026_02_11', 'p_2026_02_11', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-02-11 13:00:00'),
  ('qc_p_2026_02_16', 'p_2026_02_16', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-02-16 13:00:00'),
  ('qc_p_2026_03_17', 'p_2026_03_17', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-03-17 13:00:00'),
  ('qc_p_2026_03_19', 'p_2026_03_19', true, true, true, true, 'ACCEPT',
   'Backfilled from real ledger — assumed accepted on receipt.',
   '2026-03-19 13:00:00');

-- 5. Stock level: all 57 kegs (1,425 L) currently on hand.
--    Total cost basis = sum of all six purchase totals = 2,732,500.
INSERT INTO stock_levels
  (id, "itemType", "sizeMl", quantity, "totalLitres", "totalValue", "lastUpdated")
VALUES
  ('sl_keg_25l', 'KEG', 25000, 57, 1425.00, 2732500.00, NOW());

-- 6. KegAsset: physical container ledger.
--    avgKegCost = mean(60000, 45000, 48000, 41500, 50500, 41500) ≈ 47,750
--    totalValue (containers) = 47,750 * 57 = 2,721,750
INSERT INTO keg_assets
  (id, "totalKegs", "fullKegs", "emptyKegs", "kegUnitCost", "totalValue", "lastUpdated")
VALUES
  ('singleton', 57, 57, 0, 47750, 2721750, NOW());

COMMIT;

-- Sanity:
SELECT 'purchases' AS tbl, COUNT(*) AS rows FROM purchases
UNION ALL SELECT 'quality_checks', COUNT(*) FROM quality_checks
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'stock_levels', COUNT(*) FROM stock_levels
UNION ALL SELECT 'keg_assets', COUNT(*) FROM keg_assets
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'users', COUNT(*) FROM users;
