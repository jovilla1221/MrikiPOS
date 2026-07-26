#!/usr/bin/env bash
# Backup harian database MrikiPOS.
# Dijalankan sebagai user postgres oleh mrikipos-backup.timer.
set -euo pipefail

BACKUP_DIR="/var/backups/mrikipos"
RETENTION_DAYS=7
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/mrikipos-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Format custom (-Fc): terkompresi dan bisa direstore selektif via pg_restore.
pg_dump -Fc --dbname=mrikipos --file="${OUT}"

# Verifikasi arsip bisa dibaca sebelum menghapus backup lama.
pg_restore --list "${OUT}" > /dev/null

find "${BACKUP_DIR}" -name 'mrikipos-*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "backup ok: ${OUT} ($(du -h "${OUT}" | cut -f1))"
