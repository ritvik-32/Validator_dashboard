-- Backfill rewards_delta for historical data from December 1, 2025 onwards
-- This script calculates delta = current_total_rewards - previous_total_rewards
-- Only for data from Dec 1, 2025 onwards (matching frontend date filter)

-- Run this script after adding the rewards_delta column to all tables

\echo 'Starting backfill of rewards_delta from Dec 1, 2025 onwards...'

-- 1. Agoric
\echo 'Backfilling agoric_data...'
UPDATE agoric_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM agoric_data prev
                       WHERE prev.timestamp < agoric_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 2. Akash
\echo 'Backfilling akash_data...'
UPDATE akash_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM akash_data prev
                       WHERE prev.timestamp < akash_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 3. Cheqd
\echo 'Backfilling cheqd_data...'
UPDATE cheqd_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM cheqd_data prev
                       WHERE prev.timestamp < cheqd_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 4. Cosmos
\echo 'Backfilling cosmos_data...'
UPDATE cosmos_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM cosmos_data prev
                       WHERE prev.timestamp < cosmos_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 5. Mantra
\echo 'Backfilling mantra_data...'
UPDATE mantra_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM mantra_data prev
                       WHERE prev.timestamp < mantra_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 6. Osmosis
\echo 'Backfilling osmosis_data...'
UPDATE osmosis_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM osmosis_data prev
                       WHERE prev.timestamp < osmosis_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 7. Passage
\echo 'Backfilling passage_data...'
UPDATE passage_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM passage_data prev
                       WHERE prev.timestamp < passage_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 8. Polygon
\echo 'Backfilling polygon_data...'
UPDATE polygon_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM polygon_data prev
                       WHERE prev.timestamp < polygon_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

-- 9. Regen
\echo 'Backfilling regen_data...'
UPDATE regen_data
SET rewards_delta = CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) - 
                    COALESCE(
                      (SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC)
                       FROM regen_data prev
                       WHERE prev.timestamp < regen_data.timestamp
                       ORDER BY prev.timestamp DESC
                       LIMIT 1),
                      0
                    )
WHERE rewards_delta IS NULL 
  AND timestamp >= '2025-12-01';

\echo 'Backfill complete!'
\echo 'Verifying results...'

-- Verify the backfill
SELECT 'agoric_data' as table_name, COUNT(*) as total_rows, COUNT(rewards_delta) as filled_deltas FROM agoric_data
UNION ALL
SELECT 'akash_data', COUNT(*), COUNT(rewards_delta) FROM akash_data
UNION ALL
SELECT 'cheqd_data', COUNT(*), COUNT(rewards_delta) FROM cheqd_data
UNION ALL
SELECT 'cosmos_data', COUNT(*), COUNT(rewards_delta) FROM cosmos_data
UNION ALL
SELECT 'mantra_data', COUNT(*), COUNT(rewards_delta) FROM mantra_data
UNION ALL
SELECT 'osmosis_data', COUNT(*), COUNT(rewards_delta) FROM osmosis_data
UNION ALL
SELECT 'passage_data', COUNT(*), COUNT(rewards_delta) FROM passage_data
UNION ALL
SELECT 'polygon_data', COUNT(*), COUNT(rewards_delta) FROM polygon_data
UNION ALL
SELECT 'regen_data', COUNT(*), COUNT(rewards_delta) FROM regen_data;
