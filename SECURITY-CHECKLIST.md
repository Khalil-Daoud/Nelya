# 🔐 CHECKLIST DE SÉCURITÉ - NELYA E-COMMERCE

## ✅ À FAIRE AVANT LA MISE EN PRODUCTION

### 🔴 CRITIQUE - Obligatoire

- [ ] **Générer de nouveaux secrets forts**
  - [ ] Nouveau DB_PASSWORD (32+ caractères aléatoires)
  - [ ] Nouveau JWT_SECRET (128+ caractères aléatoires)
  - [ ] Utiliser `openssl rand -base64 32` et `openssl rand -hex 64`

- [ ] **Configurer HTTPS/SSL**
  - [ ] Obtenir un certificat SSL (Let's Encrypt recommandé)
  - [ ] Configurer Nginx avec SSL
  - [ ] Forcer la redirection HTTP → HTTPS
  - [ ] Activer HSTS

- [ ] **Sécuriser la base de données**
  - [ ] Supprimer l'exposition du port PostgreSQL (`ports: 5432:5432`)
  - [ ] Utiliser un mot de passe fort
  - [ ] Limiter les connexions aux conteneurs internes uniquement

- [ ] **Supprimer les outils de développement**
  - [ ] Retirer Adminer du docker-compose.prod.yml
  - [ ] Supprimer les endpoints de debug

- [ ] **Configurer NODE_ENV=production**
  - [ ] Dans tous les conteneurs backend
  - [ ] Vérifier que les stack traces détaillées sont désactivées

- [ ] **Sécuriser les fichiers de configuration**
  - [ ] Ne JAMAIS commiter `.env.production`
  - [ ] Ajouter `.env.production` au `.gitignore`
  - [ ] Utiliser des permissions 600 pour les fichiers de secrets

### ⚠️ IMPORTANT - Fortement recommandé

- [ ] **Rate Limiting**
  - [ ] Rate limiting sur les endpoints d'authentification (✅ déjà fait)
  - [ ] Rate limiting global sur toutes les API
  - [ ] Rate limiting sur les uploads

- [ ] **Validation et sanitisation**
  - [ ] Valider toutes les entrées utilisateur
  - [ ] Sanitiser les uploads de fichiers
  - [ ] Limiter les tailles d'upload (10MB max)

- [ ] **Headers de sécurité**
  - [ ] Helmet.js activé (✅ déjà fait)
  - [ ] CORS correctement configuré avec le domaine de production
  - [ ] CSP (Content Security Policy)
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options

- [ ] **Monitoring et logs**
  - [ ] Configurer un système de logs centralisé
  - [ ] Monitoring de disponibilité (UptimeRobot)
  - [ ] Alertes automatiques en cas de panne
  - [ ] Ne pas logger les informations sensibles (mots de passe, tokens)

- [ ] **Backups**
  - [ ] Backup automatique quotidien de la base de données
  - [ ] Tester la restauration d'un backup
  - [ ] Backup des images uploadées
  - [ ] Stocker les backups dans un endroit sécurisé (cloud)

### 🟡 RECOMMANDÉ - Bonne pratique

- [ ] **Authentification renforcée**
  - [ ] Implémenter 2FA (authentification à deux facteurs)
  - [ ] Politique de mots de passe forts
  - [ ] Expiration des tokens JWT (actuellement configuré)
  - [ ] Rotation des tokens

- [ ] **Protection contre les attaques**
  - [ ] WAF (Web Application Firewall) - Cloudflare ou AWS WAF
  - [ ] Protection DDoS
  - [ ] CAPTCHA sur les formulaires sensibles

- [ ] **Audits réguliers**
  - [ ] Scanner de vulnérabilités (Snyk, npm audit)
  - [ ] Tests de pénétration
  - [ ] Revue de code régulière

- [ ] **Gestion des dépendances**
  - [ ] Mettre à jour les dépendances régulièrement
  - [ ] Utiliser `npm audit` pour détecter les vulnérabilités
  - [ ] Utiliser Dependabot ou Renovate

---

## 🔍 TESTS DE SÉCURITÉ

### Tests à effectuer avant la mise en production

```bash
# 1. Tester les headers de sécurité
curl -I https://votre-domaine.com

# Vérifier la présence de:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - Content-Security-Policy

# 2. Tester la redirection HTTPS
curl -I http://votre-domaine.com
# Devrait retourner un 301 vers https://

# 3. Tester le rate limiting
for i in {1..15}; do
  curl -X POST https://votre-domaine.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done
# Après 10 tentatives, devrait retourner 429 Too Many Requests

# 4. Tester l'accès à la base de données
# Devrait échouer (pas de connexion externe possible)
psql -h votre-domaine.com -U nelya_user -d nelya_db

# 5. Scanner SSL
# Utiliser: https://www.ssllabs.com/ssltest/
# Objectif: Note A ou A+

# 6. Scanner de vulnérabilités npm
cd backend && npm audit
cd frontend && npm audit

# 7. Tester CORS
curl -H "Origin: https://site-malveillant.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://votre-domaine.com/api/products
# Devrait refuser l'accès
```

---

## 📋 CHECKLIST MENSUELLE DE SÉCURITÉ

### À faire chaque mois

- [ ] Vérifier les logs pour activités suspectes
- [ ] Mettre à jour les dépendances npm
- [ ] Exécuter `npm audit` et corriger les vulnérabilités
- [ ] Tester la restauration d'un backup
- [ ] Vérifier que les certificats SSL ne vont pas expirer
- [ ] Réviser les accès et permissions
- [ ] Vérifier les métriques de monitoring

---

## 🚨 EN CAS D'INCIDENT DE SÉCURITÉ

### Procédure d'urgence

1. **Isoler**
   - Mettre l'application en mode maintenance
   - Bloquer les IP suspectes

2. **Analyser**
   - Consulter les logs
   - Identifier la faille
   - Évaluer l'impact

3. **Corriger**
   - Patcher la vulnérabilité
   - Changer tous les secrets (DB_PASSWORD, JWT_SECRET)
   - Invalider toutes les sessions actives

4. **Restaurer**
   - Restaurer depuis un backup sain si nécessaire
   - Tester en environnement de staging
   - Redéployer en production

5. **Communiquer**
   - Informer les utilisateurs si leurs données ont été compromises
   - Documenter l'incident
   - Mettre en place des mesures préventives

6. **Post-mortem**
   - Analyser ce qui s'est passé
   - Mettre à jour les procédures
   - Former l'équipe

---

## 🔗 RESSOURCES UTILES

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **npm audit**: https://docs.npmjs.com/cli/v9/commands/npm-audit
- **Let's Encrypt**: https://letsencrypt.org/

---

## 📞 CONTACTS D'URGENCE

En cas d'incident de sécurité:
1. Administrateur système: [À REMPLIR]
2. Développeur lead: [À REMPLIR]
3. Support hébergement: [À REMPLIR]

**Date de dernière révision**: 5 Septembre 2026
**Prochaine révision prévue**: 5 Octobre 2026
