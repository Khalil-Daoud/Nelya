#!/bin/sh
# ============================================
# SCRIPT DE BACKUP AUTOMATIQUE PostgreSQL
# ============================================

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nelya_backup_${TIMESTAMP}.sql.gz"

# Nombre de jours de rétention des backups
RETENTION_DAYS=7

echo "[$(date)] Démarrage du backup de la base de données..."

# Créer le dossier de backup s'il n'existe pas
mkdir -p "${BACKUP_DIR}"

# Créer le backup compressé
pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] ✅ Backup réussi: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "[$(date)] ❌ Échec du backup!"
    exit 1
fi

# Supprimer les backups plus anciens que RETENTION_DAYS
echo "[$(date)] Nettoyage des anciens backups (> ${RETENTION_DAYS} jours)..."
find "${BACKUP_DIR}" -name "nelya_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Lister les backups restants
echo "[$(date)] Backups disponibles:"
ls -lh "${BACKUP_DIR}"/nelya_backup_*.sql.gz 2>/dev/null || echo "Aucun backup trouvé"

echo "[$(date)] Backup terminé avec succès!"
