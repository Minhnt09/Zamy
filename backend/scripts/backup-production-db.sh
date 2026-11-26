#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1 || ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_dump and pg_restore are required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
KEEP_BACKUPS="${KEEP_BACKUPS:-7}"

if [[ ! "${KEEP_BACKUPS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "KEEP_BACKUPS must be a positive integer" >&2
  exit 1
fi

mkdir -p -- "${BACKUP_DIR}"
chmod 700 -- "${BACKUP_DIR}"
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'zamy-prod-*.dump' -exec chmod 600 -- {} +
timestamp="$(date -u +%Y-%m-%dT%H%M%S%NZ)"
backup_file="${BACKUP_DIR}/zamy-prod-${timestamp}.dump"
temporary_file="$(mktemp -- "${BACKUP_DIR}/.zamy-backup-XXXXXXXX")"
trap 'rm -f -- "${temporary_file}"' EXIT

pg_dump --format=custom --file="${temporary_file}" "${DATABASE_URL}"

if [[ ! -s "${temporary_file}" ]]; then
  echo "Backup archive is missing or empty" >&2
  exit 1
fi

if ! pg_restore --list "${temporary_file}" >/dev/null; then
  echo "Backup archive verification failed" >&2
  exit 1
fi
mv -- "${temporary_file}" "${backup_file}"

cleanup_old_backups() {
  local -a backups
  local backup_name
  local index

  mapfile -t backups < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'zamy-prod-*.dump' -printf '%f\n' | LC_ALL=C sort -r)
  for ((index = KEEP_BACKUPS; index < ${#backups[@]}; index += 1)); do
    backup_name="${backups[index]}"
    if ! rm -- "${BACKUP_DIR}/${backup_name}"; then
      echo "Warning: could not remove expired backup ${backup_name}" >&2
      return 1
    fi
  done
}

if ! cleanup_old_backups; then
  echo "Warning: retention cleanup did not complete; the verified backup was kept" >&2
fi

echo "Backup completed successfully"
echo "Backup file: ${backup_file}"
