#!/bin/bash
# Test script to verify the migration URL conversion logic

set -e

echo "Testing migration URL conversion logic..."
echo ""

# Test case 1: Pooler URL (port 6543)
TEST_URL_1="postgresql://user:pass@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
echo "Test 1 - Pooler URL:"
echo "  Input:  $TEST_URL_1"

MIGRATION_URL="${TEST_URL_1}"
if [[ "${MIGRATION_URL}" == *":6543"* ]]; then
  echo "  Converting pooler URL to direct connection..."
  MIGRATION_URL="${MIGRATION_URL//:6543/:5432}"
  MIGRATION_URL="${MIGRATION_URL//?pgbouncer=true/}"
  MIGRATION_URL="${MIGRATION_URL}?connect_timeout=10"
fi

echo "  Output: $MIGRATION_URL"
echo "  Expected: postgresql://user:pass@aws-1-us-east-2.pooler.supabase.com:5432/postgres?connect_timeout=10"
echo ""

# Test case 2: Direct URL (port 5432) - should remain unchanged
TEST_URL_2="postgresql://user:pass@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
echo "Test 2 - Direct URL:"
echo "  Input:  $TEST_URL_2"

MIGRATION_URL="${TEST_URL_2}"
if [[ "${MIGRATION_URL}" == *":6543"* ]]; then
  echo "  Converting pooler URL to direct connection..."
  MIGRATION_URL="${MIGRATION_URL//:6543/:5432}"
  MIGRATION_URL="${MIGRATION_URL//?pgbouncer=true/}"
  MIGRATION_URL="${MIGRATION_URL}?connect_timeout=10"
fi

echo "  Output: $MIGRATION_URL"
echo "  Expected: $TEST_URL_2 (unchanged)"
echo ""

# Test case 3: URL with existing query params
TEST_URL_3="postgresql://user:pass@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
echo "Test 3 - Pooler URL with multiple params:"
echo "  Input:  $TEST_URL_3"

MIGRATION_URL="${TEST_URL_3}"
if [[ "${MIGRATION_URL}" == *":6543"* ]]; then
  echo "  Converting pooler URL to direct connection..."
  MIGRATION_URL="${MIGRATION_URL//:6543/:5432}"
  MIGRATION_URL="${MIGRATION_URL//?pgbouncer=true/}"
  MIGRATION_URL="${MIGRATION_URL//&pgbouncer=true/}"
  # Handle case where pgbouncer might be in middle or end
  MIGRATION_URL="${MIGRATION_URL//pgbouncer=true&/}"
  if [[ "${MIGRATION_URL}" == *"?"* ]]; then
    MIGRATION_URL="${MIGRATION_URL}&connect_timeout=10"
  else
    MIGRATION_URL="${MIGRATION_URL}?connect_timeout=10"
  fi
fi

echo "  Output: $MIGRATION_URL"
echo ""

echo "✅ URL conversion logic test complete!"
echo ""
echo "Next steps:"
echo "1. Test the actual migration command with:"
echo "   DATABASE_URL='your-pooler-url' ./scripts/test-migration-command.sh"
echo "2. Or test on QA environment first (safer)"
