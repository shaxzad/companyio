-- One product name per business (e.g. only one "Petrol"). Rename older duplicates first.
WITH ranked AS (
  SELECT
    id,
    "businessId",
    name,
    code,
    ROW_NUMBER() OVER (
      PARTITION BY "businessId", lower(trim(name))
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "FuelType"
)
UPDATE "FuelType" AS f
SET name = trim(f.name) || ' (' || f.code || ')'
FROM ranked AS r
WHERE f.id = r.id
  AND r.rn > 1;

UPDATE "FuelType" SET name = trim(name) WHERE name <> trim(name);

CREATE UNIQUE INDEX "FuelType_businessId_name_key" ON "FuelType"("businessId", "name");
