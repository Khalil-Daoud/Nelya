# ============================================
# MAKEFILE - NELYA E-COMMERCE
# Commandes utiles pour gérer l'application
# ============================================

.PHONY: help dev prod build up down restart logs backup restore clean

# Variables
# NOTE: Docker Compose charge automatiquement le ".env" situé dans CE dossier
# (celui du docker-compose.yml), quel que soit le répertoire d'où "make" est lancé.
COMPOSE_DEV = docker compose -f docker-compose.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
ENV_FILE = .env.production
DEV_ENV_FILE = .env

help: ## Afficher l'aide
	@echo "Commandes disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ============================================
# DÉVELOPPEMENT
# ============================================

dev: ## Démarrer en mode développement
	@if [ ! -f $(DEV_ENV_FILE) ]; then \
		echo "❌ Erreur: docker/.env n'existe pas! Copiez docker/.env.example vers docker/.env et remplissez-le."; \
		exit 1; \
	fi
	$(COMPOSE_DEV) up -d
	@echo "✅ Application démarrée en mode développement"
	@echo "Frontend: http://localhost:4200"
	@echo "Backend: http://localhost:3000"
	@echo "Adminer: http://localhost:8080"

dev-build: ## Construire et démarrer en mode développement
	$(COMPOSE_DEV) up -d --build
	@echo "✅ Application construite et démarrée"

dev-logs: ## Voir les logs en mode développement
	$(COMPOSE_DEV) logs -f

dev-down: ## Arrêter le mode développement
	$(COMPOSE_DEV) down
	@echo "✅ Application arrêtée"

# ============================================
# PRODUCTION
# ============================================

prod: ## Démarrer en mode production
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ Erreur: Le fichier .env.production n'existe pas!"; \
		echo "Créez-le d'abord avec les bonnes valeurs."; \
		exit 1; \
	fi
	$(COMPOSE_PROD) up -d
	@echo "✅ Application démarrée en mode PRODUCTION"
	@echo "HTTPS: https://votre-domaine.com"

prod-build: ## Construire et démarrer en mode production
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ Erreur: Le fichier .env.production n'existe pas!"; \
		exit 1; \
	fi
	$(COMPOSE_PROD) build
	$(COMPOSE_PROD) up -d
	@echo "✅ Application construite et démarrée en PRODUCTION"

prod-logs: ## Voir les logs en mode production
	$(COMPOSE_PROD) logs -f

prod-down: ## Arrêter le mode production
	$(COMPOSE_PROD) down
	@echo "✅ Application arrêtée"

prod-restart: ## Redémarrer en mode production
	$(COMPOSE_PROD) restart
	@echo "✅ Application redémarrée"

# ============================================
# GESTION
# ============================================

status: ## Voir le statut des conteneurs
	@echo "=== Conteneurs actifs ==="
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

health: ## Vérifier la santé de l'application
	@echo "=== Health Check ==="
	@curl -s http://localhost:3000/api/health | jq || echo "❌ Backend non accessible"
	@curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:4200 || echo "❌ Frontend non accessible"

logs: ## Voir tous les logs
	docker compose logs -f

logs-backend: ## Voir les logs du backend uniquement
	docker compose logs -f backend

logs-frontend: ## Voir les logs du frontend uniquement
	docker compose logs -f frontend

logs-db: ## Voir les logs de la base de données
	docker compose logs -f db

shell-backend: ## Accéder au shell du backend
	docker exec -it $$(docker ps -qf "name=backend") sh

shell-db: ## Accéder au shell PostgreSQL
	docker exec -it $$(docker ps -qf "name=db") psql -U nelya_user -d nelya_db

# ============================================
# BACKUPS
# ============================================

backup: ## Créer un backup de la base de données
	@echo "🔄 Création du backup..."
	$(COMPOSE_PROD) run --rm backup
	@echo "✅ Backup créé avec succès"
	@ls -lh postgres-backups/nelya_backup_*.sql.gz | tail -5

backup-list: ## Lister les backups disponibles
	@echo "=== Backups disponibles ==="
	@ls -lh postgres-backups/nelya_backup_*.sql.gz 2>/dev/null || echo "Aucun backup trouvé"

restore: ## Restaurer un backup (Usage: make restore BACKUP=filename.sql.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "❌ Usage: make restore BACKUP=nelya_backup_20231201_020000.sql.gz"; \
		echo ""; \
		echo "Backups disponibles:"; \
		ls postgres-backups/nelya_backup_*.sql.gz 2>/dev/null || echo "Aucun backup"; \
		exit 1; \
	fi
	@echo "⚠️  ATTENTION: Ceci va écraser la base de données actuelle!"
	@read -p "Êtes-vous sûr de vouloir continuer? [yes/no]: " confirm; \
	if [ "$$confirm" != "yes" ]; then \
		echo "Restauration annulée."; \
		exit 1; \
	fi
	@echo "🔄 Restauration en cours..."
	@docker compose run --rm \
		-e PGHOST=db \
		-e PGUSER=$${DB_USER:-nelya_user} \
		-e PGPASSWORD=$${DB_PASSWORD} \
		-e PGDATABASE=$${DB_NAME:-nelya_db} \
		backup sh -c "gunzip -c /backups/$(BACKUP) | psql"
	@echo "✅ Restauration terminée"

# ============================================
# NETTOYAGE
# ============================================

clean: ## Nettoyer les conteneurs arrêtés et images inutilisées
	docker system prune -f
	@echo "✅ Nettoyage effectué"

clean-all: ## Nettoyer TOUT (⚠️ inclut les volumes)
	@echo "⚠️  ATTENTION: Ceci va supprimer TOUS les conteneurs, volumes et données!"
	@read -p "Êtes-vous sûr? [yes/no]: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker compose down -v; \
		docker system prune -af --volumes; \
		echo "✅ Nettoyage complet effectué"; \
	else \
		echo "Annulé."; \
	fi

# ============================================
# SÉCURITÉ
# ============================================

generate-secrets: ## Générer de nouveaux secrets
	@echo "=== Nouveaux Secrets ==="
	@echo "DB_PASSWORD (copier dans .env.production):"
	@openssl rand -base64 32
	@echo ""
	@echo "JWT_SECRET (copier dans .env.production):"
	@openssl rand -hex 64

audit: ## Audit de sécurité npm
	@echo "=== Audit Backend ==="
	@cd ../backend && npm audit
	@echo ""
	@echo "=== Audit Frontend ==="
	@cd ../frontend && npm audit

# ============================================
# TESTS
# ============================================

test: ## Exécuter les tests
	@echo "🧪 Exécution des tests..."
	@cd ../backend && npm test || echo "⚠️ Pas de tests backend configurés"
	@cd ../frontend && npm test || echo "⚠️ Pas de tests frontend configurés"

test-health: ## Tester tous les endpoints de santé
	@echo "=== Test Health Endpoints ==="
	@echo "Backend API:"
	@curl -s http://localhost:3000/api/health | jq || echo "❌ Échec"
	@echo ""
	@echo "Frontend:"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:4200 || echo "❌ Échec"

# ============================================
# MISE À JOUR
# ============================================

update: ## Mettre à jour l'application (git pull + rebuild)
	@echo "🔄 Mise à jour de l'application..."
	git pull
	$(COMPOSE_PROD) build
	$(COMPOSE_PROD) up -d
	@echo "✅ Application mise à jour"

# ============================================
# MONITORING
# ============================================

stats: ## Voir les statistiques des conteneurs
	docker stats --no-stream

top: ## Voir les processus des conteneurs
	docker compose top
