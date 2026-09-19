#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -eq 0 ]; then
    echo "No backups found to clean"
    exit 0
fi

echo "Found $BACKUP_COUNT backups"
echo "Cleaning backups older than $RETENTION_DAYS days..."

DELETED=0
while IFS= read -r backup; do
    if [ -f "$backup" ]; then
        rm "$backup"
        DELETED=$((DELETED + 1))
        echo "Deleted: $backup"
    fi
done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$RETENTION_DAYS" 2>/dev/null)

echo "Cleanup completed: $DELETED backup(s) deleted"
echo "Remaining backups: $((BACKUP_COUNT - DELETED))"
