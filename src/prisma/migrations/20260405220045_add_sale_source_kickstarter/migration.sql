-- New enum value only. Must be in its own migration/transaction so PostgreSQL
-- commits before CHECK constraints reference 'KICKSTARTER' (see PG error 55P04).

ALTER TYPE "SaleSource" ADD VALUE 'KICKSTARTER';
