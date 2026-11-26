#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 path/to/file.dump" >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" || ! -s "${BACKUP_FILE}" ]]; then
  echo "Backup archive is missing or empty" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required" >&2
  exit 1
fi

archive_list="$(pg_restore --list "${BACKUP_FILE}")"
core_tables=(users orders order_items payments product_variants)

for table_name in "${core_tables[@]}"; do
  if ! grep -Eq "TABLE( DATA)?[[:space:]]+public[[:space:]]+${table_name}([[:space:]]|$)" <<<"${archive_list}"; then
    echo "Backup archive is missing core table: ${table_name}" >&2
    exit 1
  fi
done

echo "Backup archive verification passed"
