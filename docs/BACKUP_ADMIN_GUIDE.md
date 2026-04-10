# Backup Administration Guide

This document describes the backup solution for the Hypothetical Publishing application so that a system administrator unfamiliar with the software can configure it from scratch, restore the database to any given backup, and test a backup for validity.

## Architecture Overview

The backup system uses a **push-based architecture** automated via GitHub Actions. Two separate workflows run daily for the Production and QA environments:

- `.github/workflows/prod-backups.yml` -- Production backups
- `.github/workflows/qa-db-backups.yml` -- QA backups

**What gets backed up:**

1. **PostgreSQL database** -- full logical dump using `pg_dump` in custom format (`-Fc`)
2. **Cover art media files** -- downloaded from Supabase Storage and synced to Backblaze B2

**Storage provider:** Backblaze B2 (S3-compatible object storage), on a separate system from the application database (Supabase-hosted PostgreSQL).

**Notification channel:** Discord webhook -- reports success, failure, and cleanup issues.

---

## Retention Policy

Backups follow a staggered retention schedule:

| Tier    | Kept | When Created           | Naming Pattern                        |
|---------|------|------------------------|---------------------------------------|
| Daily   | 7    | Every day at 2:00 AM UTC | `hyp_{env}_daily_{YYYYMMDD}.dump`    |
| Weekly  | 4    | Sundays (day_of_week=7)  | `hyp_{env}_weekly_{YYYY_WNN}.dump`   |
| Monthly | 12   | 1st of each month        | `hyp_{env}_monthly_{YYYY_MM}.dump`   |
| Yearly  | Forever | January 1st            | `hyp_{env}_yearly_{YYYY}.dump`       |

Weekly/monthly/yearly backups are copies (promotions) of the daily dump taken on that day.

Old backups beyond the retention window are automatically deleted in a cleanup step after each backup run.

---

## B2 Bucket Structure

Each environment uses two B2 buckets:

- **Backup bucket** (`B2_BACKUP_BUCKET`) -- stores database dumps:
  ```
  db/daily/hyp_prod_daily_20260328.dump
  db/weekly/hyp_prod_weekly_2026_W13.dump
  db/monthly/hyp_prod_monthly_2026_03.dump
  db/yearly/hyp_prod_yearly_2026.dump
  ```
- **Media bucket** (`B2_MEDIA_BUCKET`) -- stores cover art snapshots:
  ```
  daily/20260328/<folder>/<file>
  ```

---

## Configuration from Scratch

### Prerequisites

- A GitHub repository with Actions enabled
- A Backblaze B2 account
- A Supabase project (the application database)
- A Discord webhook URL for notifications

### Step 1: Create Backblaze B2 Buckets

1. Log in to Backblaze B2.
2. Create two **private** buckets for each environment:
   - One for database backups (e.g., `hyp-prod-db-backups`)
   - One for media backups (e.g., `hyp-prod-media-backups`)
3. Create an **application key** scoped to these buckets. Record the **Key ID** and **Application Key**.

### Step 2: Configure GitHub Secrets

For each environment (Prod and QA), add the following secrets in the GitHub repository under **Settings > Secrets and variables > Actions**:

| Secret Name                        | Description                                    |
|------------------------------------|------------------------------------------------|
| `{ENV}_DATABASE_URL`               | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `{ENV}_B2_APPLICATION_KEY_ID`      | Backblaze B2 application key ID                |
| `{ENV}_B2_APPLICATION_KEY`         | Backblaze B2 application key                   |
| `{ENV}_B2_BACKUP_BUCKET`           | Name of the B2 bucket for database dumps       |
| `{ENV}_B2_MEDIA_BUCKET`            | Name of the B2 bucket for cover art            |
| `{ENV}_SUPABASE_URL`               | Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `{ENV}_SUPABASE_SERVICE_ROLE_KEY`  | Supabase service role key (for Storage API access) |
| `{ENV}_DISCORD_WEBHOOK_URL`        | Discord webhook URL for notifications          |

Replace `{ENV}` with `PROD` or `QA`.

### Step 3: Verify the Workflow Files

Ensure the workflow files exist at:
- `.github/workflows/prod-backups.yml`
- `.github/workflows/qa-db-backups.yml`

They are configured to run on `schedule` (daily at 2 AM UTC) and can also be triggered manually via `workflow_dispatch`.

### Step 4: Test with a Manual Run

1. Go to **Actions** in the GitHub repository.
2. Select the desired backup workflow (e.g., "Prod Database Backup").
3. Click **Run workflow** on the target branch.
4. Monitor the run logs and confirm a Discord notification is received.

---

## Credential Separation

The backup system uses **separate credentials** from the application:

- **B2 Application Keys** are dedicated to the backup buckets and are not used by the application at runtime.
- **Supabase Service Role Key** is used only by the backup workflow for reading cover art from Supabase Storage; the application uses the anon key for normal operations.
- **GitHub Secrets** are only accessible to GitHub Actions runners and are not exposed to the application environment.

This ensures that compromise of the application does not grant access to backups.

---

## Restoring a Database Backup

### Step 1: Install the Backblaze B2 CLI and PostgreSQL Client

```bash
pip install b2
sudo apt-get install -y postgresql-client-17
```

### Step 2: Authenticate with B2

```bash
b2 account authorize <B2_APPLICATION_KEY_ID> <B2_APPLICATION_KEY>
```

### Step 3: List Available Backups

```bash
# List daily backups
b2 ls "b2://<B2_BACKUP_BUCKET>/db/daily/"

# List weekly backups
b2 ls "b2://<B2_BACKUP_BUCKET>/db/weekly/"

# List monthly backups
b2 ls "b2://<B2_BACKUP_BUCKET>/db/monthly/"

# List yearly backups
b2 ls "b2://<B2_BACKUP_BUCKET>/db/yearly/"
```

### Step 4: Download the Desired Backup

```bash
b2 file download "b2://<B2_BACKUP_BUCKET>/db/daily/hyp_prod_daily_20260328.dump" ./backup.dump
```

### Step 5: Restore to a Target Database

**Option A: Restore to an existing database (replacing its contents)**

```bash
pg_restore --clean --if-exists -d <TARGET_DATABASE_URL> ./backup.dump
```

**Option B: Restore to a fresh database**

```bash
createdb -h <host> -U <user> <new_db_name>
pg_restore -d postgresql://<user>:<pass>@<host>:5432/<new_db_name> ./backup.dump
```

### Step 6: Restore Cover Art (if needed)

```bash
# Download cover art from the media bucket
b2 sync "b2://<B2_MEDIA_BUCKET>/daily/<YYYYMMDD>/" ./cover-art/

# Upload to Supabase Storage (using the Supabase CLI or REST API)
# Or place files in the appropriate storage location for your deployment
```

---

## Testing a Backup for Validity

### Method 1: Verify the Dump File Structure

The backup workflow already does this automatically after each dump:

```bash
pg_restore --list ./backup.dump > /dev/null
```

If this command exits with code 0, the dump file is structurally valid and contains a readable table of contents.

### Method 2: Full Restore Test

For a thorough validity test, restore to a throwaway database:

```bash
# Create a temporary test database
createdb -h <host> -U <user> hyp_backup_test

# Restore the backup
pg_restore -d postgresql://<user>:<pass>@<host>:5432/hyp_backup_test ./backup.dump

# Verify key tables exist and have data
psql postgresql://<user>:<pass>@<host>:5432/hyp_backup_test -c "SELECT count(*) FROM books;"

# Clean up
dropdb -h <host> -U <user> hyp_backup_test
```

### Method 3: Spot-Check via Table of Contents

```bash
pg_restore --list ./backup.dump | head -50
```

Review the output to confirm expected tables, sequences, and constraints are present.

---

## Monitoring and Alerts

The backup system reports status via **Discord webhooks**:

- **Success:** Posts a message with promotion details (e.g., "Daily backup uploaded | Daily promoted to weekly") and a link to the GitHub Actions run.
- **Backup failure:** Posts a failure alert with a link to the run logs.
- **Cleanup failure:** Posts a separate warning (the backup itself succeeded, but old file cleanup failed). The cleanup step uses `continue-on-error: true` so a cleanup failure does not mark the overall job as failed.

To verify backups are running:
1. Check the Discord channel for daily notifications.
2. Review the **Actions** tab in the GitHub repository for workflow run history.
3. List files in B2 to confirm new dumps appear daily.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Workflow never runs | Cron schedule only runs on the default branch | Merge the workflow file to `main` |
| `pg_dump` fails | Wrong PostgreSQL client version or bad `DATABASE_URL` | Verify the secret and ensure `postgresql-client-17` matches the server version |
| B2 upload fails | Invalid credentials or bucket name | Re-check `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, and bucket name in secrets |
| No Discord notification | Bad webhook URL | Verify `DISCORD_WEBHOOK_URL` secret is a valid Discord webhook |
| Cover art sync finds no files | Empty Supabase Storage bucket or wrong credentials | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| Cleanup deletes wrong files | Date parsing edge cases | Review the cleanup step logs; file naming must match the expected patterns |
