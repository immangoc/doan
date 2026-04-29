-- Widen monetary columns on storage_invoice from NUMERIC(12,2) to NUMERIC(18,2).
-- The previous precision (max ~10 billion) overflows for long-stored, heavy
-- containers when daily_rate × billable_days × multipliers compounds.
ALTER TABLE storage_invoice
    ALTER COLUMN daily_rate      TYPE NUMERIC(18, 2),
    ALTER COLUMN base_fee        TYPE NUMERIC(18, 2),
    ALTER COLUMN overdue_penalty TYPE NUMERIC(18, 2),
    ALTER COLUMN total_fee       TYPE NUMERIC(18, 2);
