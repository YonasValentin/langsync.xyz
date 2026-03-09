#!/usr/bin/env bash
# =============================================================================
# PocketBase Database Backup Script
#
# Creates timestamped backups of the PocketBase SQLite database.
# Designed to run via cron or as a manual backup.
#
# Usage:
#   ./scripts/backup.sh                          # Uses defaults
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh  # Custom backup dir
#   RETENTION_DAYS=30 ./scripts/backup.sh        # Keep 30 days
#
# Cron example (daily at 2am):
#   0 2 * * * /path/to/langsync/scripts/backup.sh >> /var/log/langsync-backup.log 2>&1
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
PB_DATA_DIR="${PB_DATA_DIR:-./pb_data}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="langsync_backup_${TIMESTAMP}.db"

echo "[$(date -Iseconds)] Starting backup..."

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Check that the database file exists
DB_FILE="${PB_DATA_DIR}/data.db"
if [ ! -f "${DB_FILE}" ]; then
  echo "[$(date -Iseconds)] ERROR: Database file not found at ${DB_FILE}"
  echo "  Set PB_DATA_DIR to the directory containing data.db"
  exit 1
fi

# Use SQLite's built-in .backup command for a safe, consistent backup.
# This handles WAL mode correctly and doesn't require stopping PocketBase.
if command -v sqlite3 &> /dev/null; then
  sqlite3 "${DB_FILE}" ".backup '${BACKUP_DIR}/${BACKUP_NAME}'"
else
  # Fallback: copy with checkpoint (less safe if writes happen during copy)
  echo "[$(date -Iseconds)] WARNING: sqlite3 not found, using file copy (install sqlite3 for safer backups)"
  cp "${DB_FILE}" "${BACKUP_DIR}/${BACKUP_NAME}"
  # Also copy WAL and SHM files if they exist
  [ -f "${DB_FILE}-wal" ] && cp "${DB_FILE}-wal" "${BACKUP_DIR}/${BACKUP_NAME}-wal"
  [ -f "${DB_FILE}-shm" ] && cp "${DB_FILE}-shm" "${BACKUP_DIR}/${BACKUP_NAME}-shm"
fi

# Compress the backup
if command -v gzip &> /dev/null; then
  gzip "${BACKUP_DIR}/${BACKUP_NAME}"
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.gz"
else
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}"
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Prune old backups
DELETED=$(find "${BACKUP_DIR}" -name "langsync_backup_*" -mtime +"${RETENTION_DAYS}" -delete -print | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  echo "[$(date -Iseconds)] Pruned ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

echo "[$(date -Iseconds)] Backup complete."
