# 🚀 GUIDE DE DÉPLOIEMENT - NELYA E-COMMERCE

**Date**: 5 Septembre 2026  
**Version**: 1.0.0

---

## 📋 PRÉREQUIS

### Serveur
- Serveur Linux (Ubuntu 22.04 LTS recommandé)
- 2 GB RAM minimum (4 GB recommandé)
- 20 GB espace disque minimum
- Docker 24+ et Docker Compose 2+
- Accès SSH
- Nom de domaine pointant vers le serveur

### Outils requis
```bash
# Vérifier les versions
docker --version        # >= 24.0
docker compose version  # >= 2.0
```

---

## 🔧 ÉTAPE 1: PRÉPARATION DU SERVEUR

### 1.1 Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Installation de Docker
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Démarrer Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### 1.3 Installation de Docker Compose
```bash
sudo apt install docker-compose-plugin -y
```

### 1.4 Créer les dossiers nécessaires
```bash
mkdir -p ~/nelya-prod
cd ~/nelya-prod
```

---

## 🔐 ÉTAPE 2: CONFIGURATION DES SECRETS

### 2.1 Générer des secrets forts
```bash
# Générer un mot de passe de base de données
DB_PASSWORD=$(openssl rand -base64 32)
echo "DB_PASSWORD: $DB_PASSWORD"

# Générer un JWT Secret
JWT_SECRET=$(openssl rand -hex 64)
echo "JWT_SECRET: $JWT_SECRET"

# ⚠️ SAUVEGARDEZ CES VALEURS DANS UN ENDROIT SÛR (gestionnaire de mots de passe)
```

### 2.2 Créer le fichier .env.production
⚠️ **Important**: `docker-compose.prod.yml` se trouve dans le dossier `docker/`. Docker Compose
charge automatiquement le `.env.production` situé **dans ce même dossier** (peu importe le
répertoire courant du shell) — le fichier DOIT donc être créé dans `docker/`, pas à la racine.

```bash
cd ~/nelya-prod/docker
nano .env.production
```

Contenu:
```env
# Base de données
DB_USER=nelya_prod_user
DB_PASSWORD=COLLEZ_ICI_LE_MOT_DE_PASSE_GENERE
DB_NAME=nelya_prod_db

# JWT
JWT_SECRET=COLLEZ_ICI_LE_JWT_SECRET_GENERE

# Frontend URL (remplacez par votre domaine)
FRONTEND_URL=https://votre-domaine.com
```

### 2.3 Sécuriser le fichier
```bash
chmod 600 .env.production
```

---

## 📦 ÉTAPE 3: DÉPLOIEMENT DE L'APPLICATION

### 3.1 Cloner le code
```bash
cd ~/nelya-prod
git clone <URL_DU_REPO> .
# OU télécharger et extraire les fichiers
```

### 3.2 Construire les images
```bash
cd ~/nelya-prod
docker compose -f docker/docker-compose.prod.yml build
```

### 3.3 Démarrer l'application
```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

### 3.4 Vérifier le statut
```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker ps

# Vérifier les logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Tester le health check
curl http://localhost:3000/api/health
```

---

## 🔒 ÉTAPE 4: CONFIGURATION SSL (HTTPS)

### Option A: Let's Encrypt avec Certbot (Recommandé)

#### 4.1 Installer Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 4.2 Obtenir un certificat SSL
```bash
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

#### 4.3 Copier les certificats
```bash
sudo mkdir -p ~/nelya-prod/docker/nginx/ssl
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ~/nelya-prod/docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ~/nelya-prod/docker/nginx/ssl/
sudo chown -R $USER:$USER ~/nelya-prod/docker/nginx/ssl
```

#### 4.4 Créer la configuration Nginx SSL
```bash
nano ~/nelya-prod/docker/nginx/nginx.prod.conf
```

Ajouter au début du fichier:
```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # Certificats SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Paramètres SSL modernes
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ... Reste de la configuration existante ...
}
```

#### 4.5 Redémarrer Nginx
```bash
docker compose -f docker/docker-compose.prod.yml restart nginx
```

#### 4.6 Configurer le renouvellement automatique
```bash
# Ajouter une tâche cron pour le renouvellement
sudo crontab -e

# Ajouter cette ligne (renouvellement tous les jours à 3h du matin)
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/votre-domaine.com/*.pem ~/nelya-prod/docker/nginx/ssl/ && docker compose -f ~/nelya-prod/docker/docker-compose.prod.yml restart nginx
```

### Option B: Cloudflare (Simplifié)

Si vous utilisez Cloudflare:
1. Activer le proxy Cloudflare (nuage orange)
2. Activer SSL/TLS mode "Full (strict)"
3. Activer "Always Use HTTPS"
4. Le SSL sera géré automatiquement par Cloudflare

---

## 🔄 ÉTAPE 5: CONFIGURATION DES BACKUPS

### 5.1 Rendre les scripts exécutables
```bash
chmod +x ~/nelya-prod/docker/scripts/backup.sh
chmod +x ~/nelya-prod/docker/scripts/restore.sh
```

### 5.2 Créer le dossier de backup
```bash
mkdir -p ~/nelya-prod/docker/postgres-backups
```

### 5.3 Tester le backup manuel
```bash
docker compose -f docker/docker-compose.prod.yml run --rm backup
```

### 5.4 Configurer les backups automatiques
```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (backup quotidien à 2h du matin)
0 2 * * * cd ~/nelya-prod && docker compose -f docker/docker-compose.prod.yml run --rm backup >> ~/nelya-prod/docker/backup.log 2>&1
```

### 5.5 Sauvegarder les backups dans le cloud (Recommandé)
```bash
# Option 1: AWS S3
sudo apt install awscli -y
aws configure
# Ajouter au crontab après le backup:
30 2 * * * aws s3 sync ~/nelya-prod/docker/postgres-backups s3://votre-bucket/backups/

# Option 2: rsync vers un autre serveur
30 2 * * * rsync -avz ~/nelya-prod/docker/postgres-backups/ user@backup-server:/backups/nelya/
```

---

## 📊 ÉTAPE 6: MONITORING ET LOGS

### 6.1 Voir les logs en temps réel
```bash
# Tous les services
docker compose -f docker/docker-compose.prod.yml logs -f

# Un service spécifique
docker compose -f docker/docker-compose.prod.yml logs -f backend
docker compose -f docker/docker-compose.prod.yml logs -f frontend
```

### 6.2 Vérifier la santé des conteneurs
```bash
# Voir le statut des health checks
docker ps --format "table {{.Names}}\t{{.Status}}"

# Inspecter un conteneur
docker inspect --format='{{json .State.Health}}' nelya_backend_prod | jq
```

### 6.3 Configurer des alertes (Optionnel mais recommandé)

#### Utiliser UptimeRobot (gratuit)
1. Créer un compte sur https://uptimerobot.com
2. Ajouter un monitor HTTP pour `https://votre-domaine.com`
3. Ajouter un monitor HTTP pour `https://votre-domaine.com/api/health`
4. Configurer les alertes par email/SMS

#### Utiliser Better Stack (recommandé)
```bash
# Installer l'agent Better Stack
curl -fsSL https://uptime.betterstack.com/install.sh | bash
```

---

## 🔧 ÉTAPE 7: MAINTENANCE

### 7.1 Mettre à jour l'application
```bash
cd ~/nelya-prod

# Pull les dernières modifications
git pull

# Reconstruire les images
docker compose -f docker/docker-compose.prod.yml build

# Redémarrer avec les nouvelles images
docker compose -f docker/docker-compose.prod.yml up -d
```

### 7.2 Redémarrer un service
```bash
docker compose -f docker/docker-compose.prod.yml restart backend
```

### 7.3 Arrêter l'application
```bash
docker compose -f docker/docker-compose.prod.yml down
```

### 7.4 Arrêter et supprimer les données
```bash
# ⚠️ ATTENTION: Ceci supprimera TOUTES les données
docker compose -f docker/docker-compose.prod.yml down -v
```

### 7.5 Restaurer un backup
```bash
# Lister les backups disponibles
ls -lh ~/nelya-prod/docker/postgres-backups/

# Restaurer un backup spécifique
docker compose -f docker/docker-compose.prod.yml run --rm \
  -e PGHOST=db \
  -e PGUSER=nelya_prod_user \
  -e PGPASSWORD=VOTRE_MOT_DE_PASSE \
  -e PGDATABASE=nelya_prod_db \
  backup sh -c "gunzip -c /backups/nelya_backup_20260905_020000.sql.gz | psql"
```

---

## 🐛 DÉPANNAGE

### Problème: Les conteneurs ne démarrent pas
```bash
# Vérifier les logs
docker compose -f docker/docker-compose.prod.yml logs

# Vérifier l'espace disque
df -h

# Vérifier la RAM
free -h
```

### Problème: "Cannot connect to database"
```bash
# Vérifier que le conteneur DB est en cours d'exécution
docker ps | grep nelya_db

# Vérifier les logs de la DB
docker compose -f docker/docker-compose.prod.yml logs db

# Tester la connexion manuellement
docker exec -it nelya_db_prod psql -U nelya_prod_user -d nelya_prod_db
```

### Problème: "502 Bad Gateway"
```bash
# Vérifier que le backend répond
docker exec nelya_backend_prod curl http://localhost:3000/api/health

# Vérifier les logs du backend
docker compose -f docker/docker-compose.prod.yml logs backend

# Redémarrer le backend
docker compose -f docker/docker-compose.prod.yml restart backend
```

### Problème: Certificat SSL expiré
```bash
# Renouveler manuellement
sudo certbot renew

# Copier les nouveaux certificats
sudo cp /etc/letsencrypt/live/votre-domaine.com/*.pem ~/nelya-prod/docker/nginx/ssl/

# Redémarrer Nginx
docker compose -f docker/docker-compose.prod.yml restart nginx
```

---

## 📝 CHECKLIST POST-DÉPLOIEMENT

- [ ] L'application est accessible via HTTPS
- [ ] Le certificat SSL est valide
- [ ] Les logs ne montrent pas d'erreurs
- [ ] Le health check répond correctement: `curl https://votre-domaine.com/api/health`
- [ ] Les backups automatiques sont configurés
- [ ] Un backup manuel a été testé et restauré avec succès
- [ ] Le monitoring est actif (UptimeRobot ou équivalent)
- [ ] Les alertes fonctionnent (tester en arrêtant un service)
- [ ] La documentation est à jour
- [ ] L'équipe connaît les procédures de maintenance

---

## 🔗 LIENS UTILES

- **Logs**: `docker compose -f docker/docker-compose.prod.yml logs -f`
- **Status**: `docker ps`
- **Health**: `https://votre-domaine.com/api/health`
- **Backend API**: `https://votre-domaine.com/api/products`
- **Frontend**: `https://votre-domaine.com`

---

## 📞 SUPPORT

En cas de problème:
1. Consulter les logs: `docker compose logs`
2. Vérifier le health check: `curl http://localhost:3000/api/health`
3. Consulter la documentation: `PRODUCTION-AUDIT.md`
4. Restaurer un backup si nécessaire

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

1. ✅ Configurer un CDN (Cloudflare)
2. ✅ Mettre en place un WAF (Web Application Firewall)
3. ✅ Implémenter CI/CD (GitHub Actions)
4. ✅ Ajouter des tests automatisés
5. ✅ Configurer Prometheus + Grafana pour monitoring avancé
6. ✅ Implémenter la rotation automatique des secrets
7. ✅ Ajouter documentation API avec Swagger

**Bon déploiement ! 🚀**
