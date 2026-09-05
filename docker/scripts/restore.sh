#!/bin/sh
# ============================================
# SCRIPT DE RESTAURATION PostgreSQL
# ============================================

set -e

BACKUP_DIR="/backups"

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Backups disponibles:"
    ls -lh "${BACKUP_DIR}"/nelya_backup_*.sql.gz 2>/dev/null || echo "Aucun backup trouvé"
    exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Erreur: Le fichier ${BACKUP_FILE} n'existe pas!"
    exit 1
fi

echo "⚠️  ATTENTION: Cette opération va écraser la base de données actuelle!"
echo "Backup à restaurer: ${BACKUP_FILE}"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Restauration annulée."
    exit 0
fi

echo "[$(date)] Démarrage de la restauration..."

# Restaurer le backup
gunzip -c "${BACKUP_FILE}" | psql -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}"

if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Restauration réussie depuis ${BACKUP_FILE}"
else
    echo "[$(date)] ❌ Échec de la restauration!"
    exit 1
fi

echo "[$(date)] Restauration terminée avec succès!"
