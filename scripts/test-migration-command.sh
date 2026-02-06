#!/bin/bash
# Test script to verify prisma migrate deploy works with converted URL

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Usage: DATABASE_URL='your-database-url' ./scripts/test-migration-command.sh"
  exit 1
fi

echo "Testing Prisma migration with URL conversion..."
echo ""

# Convert pooler URL to direct connection if needed
MIGRATION_DATABASE_URL="${DATABASE_URL}"
if [[ "${DATABASE_URL}" == *":6543"* ]]; then
  echo "🔧 Converting pooler URL (port 6543) to direct connection (port 5432)..."
  MIGRATION_DATABASE_URL="${DATABASE_URL//:6543/:5432}"
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//?pgbouncer=true/}"
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL}?connect_timeout=10"
  echo "   Original: ${DATABASE_URL}"
  echo "   Converted: ${MIGRATION_DATABASE_URL}"
else
  echo "✅ Using direct connection URL (no conversion needed)"
fi

echo ""
echo "Testing connection with: prisma migrate status"
echo ""

# Test connection first with migrate status (safer than deploy)
export DATABASE_URL="${MIGRATION_DATABASE_URL}"
timeout 30 npx prisma migrate status --schema=src/prisma/schema.prisma || {
  echo ""
  echo "❌ Migration status check failed or timed out"
  echo "This might indicate:"
  echo "  - Database connection issue"
  echo "  - Network timeout"
  echo "  - Invalid credentials"
  exit 1
}

echo ""
echo "✅ Connection successful! Migration URL conversion works."
echo ""
echo "To test the actual migration deploy (be careful - this applies migrations):"
echo "  DATABASE_URL='${MIGRATION_DATABASE_URL}' npx prisma migrate deploy --schema=src/prisma/schema.prisma"
