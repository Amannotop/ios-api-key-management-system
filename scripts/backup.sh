#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-license_key_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"
echo "Starting backup: $BACKUP_FILE"

export PGPASSWORD="$DB_PASSWORD"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup completed: $BACKUP_FILE (Size: $BACKUP_SIZE)"

echo "$BACKUP_FILE" > "${BACKUP_DIR}/latest_backup"

if command -v aws &> /dev/null; then
    if [ -n "$AWS_S3_BUCKET" ]; then
        echo "Uploading to S3: $AWS_S3_BUCKET"
        aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BUCKET}/backups/$(basename $BACKUP_FILE)"
    fi
fi

if command -v az &> /dev/null; then
    if [ -n "$AZURE_STORAGE_CONTAINER" ]; then
        echo "Uploading to Azure Blob Storage"
        az storage blob upload --container-name "$AZURE_STORAGE_CONTAINER" --name "backups/$(basename $BACKUP_FILE)" --file "$BACKUP_FILE"
    fi
fi

echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup process completed successfully"
