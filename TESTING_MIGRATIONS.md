# Testing Migration Deployment Fix

This guide explains how to test the migration deployment fix before deploying to production.

## The Problem

The `prisma migrate deploy` command was hanging because Supabase connection pooler (port 6543) doesn't work well with migrations. Migrations need a direct database connection (port 5432).

## Testing Options

### Option 1: Test URL Conversion Logic (Safest - No Database Required)

Test the URL conversion script locally:

```bash
./scripts/test-migration-url.sh
```

This verifies that:
- Pooler URLs (port 6543) are correctly converted to direct connection (port 5432)
- Direct URLs remain unchanged
- Query parameters are handled correctly

### Option 2: Test Migration Connection (Safe - Read-Only)

Test the actual database connection with your QA database URL:

```bash
# Use your QA DATABASE_URL (the pooler URL)
DATABASE_URL='postgresql://user:pass@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true' \
  ./scripts/test-migration-command.sh
```

This will:
- Convert the pooler URL to direct connection
- Test the connection with `prisma migrate status` (read-only, safe)
- Verify the connection works without hanging

### Option 3: Test on QA Environment (Recommended)

1. **Push your changes to the `qa` branch:**
   ```bash
   git checkout qa
   git merge main  # or your feature branch
   git push origin qa
   ```

2. **Monitor the GitHub Actions workflow:**
   - Go to your repository → Actions tab
   - Watch the "deploy-qa" workflow
   - Check the logs to see:
     - URL conversion happening
     - Migration completing without hanging
     - Success message

3. **Verify the deployment:**
   - Check that QA environment is running
   - Verify database migrations were applied

### Option 4: Test Migration Deploy Locally (Advanced)

If you want to test the actual `migrate deploy` command locally:

```bash
# Set your DATABASE_URL (use a test database or QA)
export DATABASE_URL='your-pooler-url-here'

# Convert URL manually
MIGRATION_DATABASE_URL="${DATABASE_URL//:6543/:5432}"
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//pgbouncer=true/}"
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//&&/&}"
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//?&/?}"
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//&?/?}"
if [[ "${MIGRATION_DATABASE_URL}" == *"?"* ]]; then
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL}&connect_timeout=10"
else
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL}?connect_timeout=10"
fi

# Run migration with converted URL
DATABASE_URL="${MIGRATION_DATABASE_URL}" \
  npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

⚠️ **Warning:** This will apply migrations to your database. Only use with a test/QA database.

## Recommended Testing Flow

1. ✅ **Test URL conversion logic** (Option 1) - Quick sanity check
2. ✅ **Test on QA** (Option 3) - Most realistic test
3. ✅ **Deploy to production** - After QA passes

## What to Look For

When testing, verify:

- ✅ URL conversion happens (check logs for "Converting pooler URL...")
- ✅ Migration completes within 120 seconds (timeout is set)
- ✅ No hanging on "Datasource" line
- ✅ Migration status shows "Database schema is up to date" or applies migrations successfully
- ✅ Application starts correctly after migration

## Troubleshooting

If migrations still hang:

1. **Check the converted URL** - Verify port 5432 is used, not 6543
2. **Check network connectivity** - Ensure the deployment server can reach Supabase
3. **Check database credentials** - Verify DATABASE_URL is correct
4. **Check for database locks** - Another process might be holding a lock
5. **Increase timeout** - If needed, increase the `timeout 120` value

## Moving from QA to Prod

Once QA testing passes:

1. Merge QA changes to `main` branch
2. Push to `main` - this triggers prod deployment
3. Monitor the GitHub Actions workflow
4. Verify production deployment succeeds
