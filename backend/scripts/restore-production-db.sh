#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BACKUP_FILE:-}" ]]; then
  echo "BACKUP_FILE is required" >&2
  exit 1
fi

if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "TARGET_DATABASE_URL is required" >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" && "${TARGET_DATABASE_URL}" == "${DATABASE_URL}" ]]; then
  echo "Refusing to restore into production database directly" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  echo "pg_restore and psql are required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/verify-backup.sh" "${BACKUP_FILE}"

# The target must be an empty temporary database. This script never drops a
# database or uses --clean, and rejects a schema that already has tables.
existing_table_count="$(psql \
  --dbname="${TARGET_DATABASE_URL}" \
  --no-align \
  --tuples-only \
  --quiet \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"

if [[ "${existing_table_count}" != "0" ]]; then
  echo "Target database must be empty" >&2
  exit 1
fi

pg_restore \
  --dbname="${TARGET_DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "${BACKUP_FILE}"

psql \
  --dbname="${TARGET_DATABASE_URL}" \
  --no-align \
  --tuples-only \
  --quiet \
  --set=ON_ERROR_STOP=1 \
  --command="
    SELECT 'users: ' || count(*) FROM public.users;
    SELECT 'orders: ' || count(*) FROM public.orders;
    SELECT 'order_items: ' || count(*) FROM public.order_items;
    SELECT 'payments: ' || count(*) FROM public.payments;
    SELECT 'product_variants: ' || count(*) FROM public.product_variants;
  "

echo "Restore verification completed successfully"
