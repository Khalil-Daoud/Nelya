# 🐛 ISSUES — Nelya E-Commerce

Documentation des problèmes identifiés lors de l'audit du projet.  
Dernière mise à jour : 2026-05-18

---

## Légende de priorité

| Icone | Priorité | Signification |
|-------|----------|---------------|
| 🔴 | **CRITIQUE** | Bloque la mise en production — à corriger immédiatement |
| 🟠 | **IMPORTANT** | Fonctionnalité manquante ou cassée |
| 🟡 | **MINEUR** | Amélioration recommandée |

---

## 🔴 Problèmes Critiques

---

### [BUG-001] Seeder détruit toute la base de données à chaque démarrage

**Fichier** : `backend/src/server.js` (ligne 18) + `backend/src/utils/seeder.js` (lignes 9-10)

**Description** :  
Le seeder est appelé automatiquement à chaque démarrage du serveur. Il commence par effacer toutes les données existantes avant d'insérer 3 produits de démonstration. En production, toute donnée créée (produits, commandes, utilisateurs) serait perdue au prochain redémarrage.

**Code problématique** :
```js
// server.js - appelé à CHAQUE démarrage
await seedData();

// seeder.js - EFFACE tout en premier
await Product.destroy({ where: {}, truncate: { cascade: true } });
await Category.destroy({ where: {}, truncate: { cascade: true } });
```

**Impact** : Perte totale de données en production.

**Fix recommandé** :
```js
// Conditionner le seed : n'insérer que si la table est vide
const count = await Product.count();
if (count === 0) {
  await seedData();
}
// OU : supprimer complètement l'appel à seedData() dans server.js
```

---

### [BUG-002] Secrets hardcodés et non sécurisés

**Fichiers** :  
- `docker/docker-compose.yml` (lignes 10, 26)  
- `backend/.env` (lignes 4, 7)  
- `backend/src/config/database.js` (ligne 7)

**Description** :  
Les secrets de connexion à la base de données et la clé JWT sont des valeurs par défaut triviales, hardcodées dans plusieurs fichiers. La clé JWT n'a jamais été changée depuis le placeholder initial.

**Code problématique** :
```yaml
# docker-compose.yml
POSTGRES_PASSWORD: secretpassword
JWT_SECRET: votre_secret_tres_securise
```
```env
# backend/.env
DB_PASSWORD=secretpassword
JWT_SECRET=your_jwt_secret_key_here  # Placeholder jamais changé !
```
```js
// database.js - fallback dangereux
process.env.DB_PASSWORD || 'secretpassword'
```

**Impact** : Compromission totale du système si le code est exposé (GitHub, etc.).

**Fix recommandé** :
1. Générer un JWT_SECRET fort : `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Ne jamais commiter `.env` — ajouter au `.gitignore`
3. Supprimer les valeurs fallback dans `database.js`
4. Utiliser des variables d'environnement système en production

---

### [BUG-003] Toutes les routes API sont publiques (aucune authentification)

**Fichier** : `backend/src/services/dynamicRouter.js`

**Description** :  
Le routeur dynamique génère des routes CRUD sans aucun middleware d'authentification. N'importe qui peut créer, modifier ou supprimer des produits, utilisateurs et commandes sans être connecté.

**Code problématique** :
```js
// Aucun middleware auth sur ces routes !
router.post('/', async (req, res) => { ... })
router.put('/:id', async (req, res) => { ... })
router.delete('/:id', async (req, res) => { ... })
```

**Impact** : Toute l'API est ouverte publiquement.

**Fix recommandé** :
```js
const { auth, authorize } = require('../middlewares/auth');

// Routes publiques
router.get('/', ...)
router.get('/:id', ...)

// Routes protégées
router.post('/', auth, authorize('admin', 'seller'), ...)
router.put('/:id', auth, authorize('admin', 'seller'), ...)
router.delete('/:id', auth, authorize('admin'), ...)
```

---

### [BUG-004] CORS totalement ouvert

**Fichier** : `backend/src/app.js` (ligne 20)

**Description** :  
La configuration CORS accepte toutes les origines sans restriction. N'importe quel site web peut faire des requêtes à l'API.

**Code problématique** :
```js
app.use(cors()); // Accepte TOUTES les origines
```

**Fix recommandé** :
```js
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
```

---

### [BUG-005] `sequelize.sync({ alter: true })` dangereux en production

**Fichier** : `backend/src/server.js` (ligne 14)

**Description** :  
L'option `alter: true` modifie automatiquement le schéma de la base de données à chaque démarrage. Elle peut supprimer des colonnes, changer des types de données, ou corrompre des données existantes. Le commentaire dans le code lui-même avertit de ce problème.

**Code problématique** :
```js
// Sync models (Caution: use migrations for production)  ← le code le sait !
await sequelize.sync({ alter: true });
```

**Fix recommandé** : Utiliser les migrations Sequelize (`sequelize-cli`).
```bash
npm install --save-dev sequelize-cli
npx sequelize-cli migration:generate --name create-products
npx sequelize-cli db:migrate
```

---

### [BUG-006] Modèle `Order` référencé mais inexistant

**Fichiers** :  
- `backend/src/app.js` (ligne 30)  
- `backend/src/models/index.js`

**Description** :  
La route `/api/orders` est enregistrée et pointe vers `models['Order']`, mais ce modèle n'est jamais défini ni exporté. La variable est `undefined`, ce qui provoque un crash du serveur à la première requête sur cette route.

**Code problématique** :
```js
// app.js
app.use('/api/orders', createDynamicRouter('Order')); // 'Order' n'existe pas !

// models/index.js - Order est absent
const models = { User, Product, Category, sequelize };
```

**Fix recommandé** : Créer `backend/src/models/Order.js` et `OrderItem.js`, puis les exporter dans `models/index.js`.

---

### [BUG-007] Backend Dockerfile utilise `nodemon` (outil de développement) en production

**Fichier** : `backend/Dockerfile` (ligne 13)

**Description** :  
La commande de démarrage du conteneur backend appelle `npm run dev`, qui lance `nodemon`. `nodemon` surveille les fichiers et redémarre le serveur à chaque modification — comportement inadapté et risqué en production.

**Code problématique** :
```dockerfile
CMD ["npm", "run", "dev"]  # Lance nodemon !
```

**Fix recommandé** :
```dockerfile
CMD ["npm", "start"]  # Lance: node src/server.js
```

---

### [BUG-008] Hash du mot de passe renvoyé dans les réponses API

**Fichier** : `backend/src/controllers/AuthController.js` (lignes 16, 31)

**Description** :  
Lors du login et du register, l'objet `user` complet est sérialisé dans la réponse JSON, incluant le champ `password` (hash bcrypt). Ce hash est ensuite stocké dans le `localStorage` du navigateur.

**Code problématique** :
```js
// Le hash password est inclus dans la réponse !
res.status(201).json({ user, token });
res.status(200).json({ user, token });
```

**Fix recommandé** :
```js
const { password, ...userSafe } = user.toJSON();
res.status(200).json({ user: userSafe, token });
```

---

### [BUG-009] Nginx sans configuration SPA — les URLs directes retournent 404

**Fichier** : `frontend/Dockerfile`

**Description** :  
Le Dockerfile copie les fichiers Angular dans Nginx sans fournir de configuration personnalisée. Pour une Single Page Application (SPA) Angular avec routing HTML5, Nginx doit être configuré pour rediriger toutes les routes vers `index.html`. Sans cela, accéder directement à `/collection` ou `/cart` retourne une erreur 404.

**Fix recommandé** :  
Créer `frontend/nginx.conf` :
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;  # Essentiel pour les SPA !
  }
}
```
Et mettre à jour le Dockerfile :
```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

---

## 🟠 Fonctionnalités Manquantes

---

### [BUG-010] Bouton "Passer la commande" non fonctionnel

**Fichier** : `frontend/src/app/cart/cart.component.ts` (ligne 55)

**Description** :  
Le bouton de validation de commande n'a aucun gestionnaire d'événement. Un clic ne fait strictement rien.

**Code problématique** :
```html
<!-- Pas de (click), pas de routerLink, rien -->
<button mat-raised-button color="primary" class="checkout-btn">PASSER LA COMMANDE</button>
```

---

### [BUG-011] `decrease()` dans le panier ne met pas à jour le service

**Fichier** : `frontend/src/app/cart/cart.component.ts` (lignes 114-120)

**Description** :  
La méthode `decrease()` modifie directement la propriété `quantity` de l'objet sans passer par le `CartService`. Le `BehaviorSubject` n'est pas notifié, donc le badge du panier dans la navbar affiche un nombre incorrect.

**Code problématique** :
```ts
decrease(item: CartItem) {
  if (item.quantity > 1) {
    item.quantity--;
    // Notify service? For a real app, the service should handle this.
    // → Le service N'EST PAS notifié
  }
}
```

**Fix recommandé** : Ajouter une méthode `decreaseQuantity(id)` dans `CartService`.

---

### [BUG-012] Panier non persisté (vidé au refresh)

**Fichier** : `frontend/src/app/services/cart.service.ts`

**Description** :  
Le panier est stocké uniquement en mémoire via un `BehaviorSubject`. Un refresh de page vide complètement le panier.

**Fix recommandé** : Sauvegarder/charger le panier depuis `localStorage`.

---

### [BUG-013] Bouton "Modifier" dans l'admin est un stub vide

**Fichier** : `frontend/src/app/admin/products-manager/products-manager.component.ts` (ligne 46)

**Description** :  
Le bouton d'édition d'un produit n'a aucun `(click)`, aucun formulaire, aucune logique associée.

**Code problématique** :
```html
<!-- Aucun (click) handler -->
<button mat-icon-button color="primary"><mat-icon>edit</mat-icon></button>
```

---

### [BUG-014] Dashboard admin avec données fictives statiques

**Fichier** : `frontend/src/app/admin/dashboard/dashboard.component.ts` (lignes 113-135)

**Description** :  
Toutes les métriques (chiffre d'affaires, commandes, clients) et les commandes récentes sont des tableaux hardcodés dans le composant. Elles ne reflètent pas les vraies données de la base.

---

### [BUG-015] URL de l'API hardcodée en `localhost`

**Fichiers** :  
- `frontend/src/app/services/api.service.ts` (ligne 9)  
- `frontend/src/app/services/auth.service.ts` (ligne 17)

**Description** :  
Les URLs pointent vers `http://localhost:3000`, ce qui ne fonctionnera jamais en production.

**Code problématique** :
```ts
private baseUrl = 'http://localhost:3000/api';
private apiUrl = 'http://localhost:3000/api/auth';
```

**Fix recommandé** : Utiliser les environments Angular.
```ts
// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.votre-domaine.com/api'
};
```

---

## 🟡 Problèmes Mineurs

---

### [BUG-016] Pas de rate-limiting sur les routes d'authentification

**Fichier** : `backend/src/app.js`

**Description** :  
L'endpoint `/api/auth/login` peut être soumis à des attaques par force brute sans aucune limitation de requêtes.

**Fix recommandé** : `npm install express-rate-limit`

---

### [BUG-017] Aucune validation des inputs côté backend

**Fichier** : `backend/src/services/dynamicRouter.js` + `BaseController.js`

**Description** :  
`req.body` est passé directement à Sequelize sans validation préalable. Des données malformées ou malveillantes peuvent être insérées.

---

### [BUG-018] `lang="en"` dans un site en français

**Fichier** : `frontend/src/index.html` (ligne 2)

**Code problématique** :
```html
<html lang="en">  <!-- Le site est en français ! -->
```

**Fix** : `<html lang="fr">`

---

### [BUG-019] Images des produits du seeder pointent vers localhost

**Fichier** : `backend/src/utils/seeder.js` (lignes 23, 31, 39)

**Description** :  
Les URLs des images des produits de démonstration pointent vers `http://localhost:3000/img/...`. Ces images seront cassées en production.

---

### [BUG-020] Adminer exposé publiquement dans docker-compose

**Fichier** : `docker/docker-compose.yml` (lignes 40-46)

**Description** :  
Adminer (interface d'administration de base de données) est exposé sur le port 8080 sans aucune restriction d'accès. En production, n'importe qui pourrait tenter d'accéder à cet outil.

**Fix** : Supprimer le service `adminer` du docker-compose de production ou le restreindre à un réseau interne.

---

### [BUG-021] Aucun test écrit

**Fichier** : `backend/package.json`

**Description** :  
`jest` et `supertest` sont déclarés comme devDependencies mais aucun fichier de test n'existe dans le projet. Le script `npm test` n'a aucun test à exécuter.

---

## 📋 Récapitulatif

| ID | Titre | Priorité | Statut |
|----|-------|----------|--------|
| BUG-001 | Seeder détruit la BDD au démarrage | 🔴 Critique | ❌ Ouvert |
| BUG-002 | Secrets hardcodés | 🔴 Critique | ❌ Ouvert |
| BUG-003 | Routes API non protégées | 🔴 Critique | ❌ Ouvert |
| BUG-004 | CORS ouvert | 🔴 Critique | ❌ Ouvert |
| BUG-005 | sync({ alter: true }) en prod | 🔴 Critique | ❌ Ouvert |
| BUG-006 | Modèle Order inexistant | 🔴 Critique | ❌ Ouvert |
| BUG-007 | nodemon en production | 🔴 Critique | ❌ Ouvert |
| BUG-008 | Hash password dans la réponse API | 🔴 Critique | ❌ Ouvert |
| BUG-009 | Nginx sans config SPA | 🔴 Critique | ❌ Ouvert |
| BUG-010 | Bouton checkout non fonctionnel | 🟠 Important | ❌ Ouvert |
| BUG-011 | decrease() ne notifie pas le service | 🟠 Important | ❌ Ouvert |
| BUG-012 | Panier non persisté | 🟠 Important | ❌ Ouvert |
| BUG-013 | Bouton éditer stub vide | 🟠 Important | ❌ Ouvert |
| BUG-014 | Dashboard avec données fictives | 🟠 Important | ❌ Ouvert |
| BUG-015 | URL API hardcodée localhost | 🟠 Important | ❌ Ouvert |
| BUG-016 | Pas de rate-limiting | 🟡 Mineur | ❌ Ouvert |
| BUG-017 | Pas de validation inputs backend | 🟡 Mineur | ❌ Ouvert |
| BUG-018 | lang="en" site en français | 🟡 Mineur | ❌ Ouvert |
| BUG-019 | Images seeder en localhost | 🟡 Mineur | ❌ Ouvert |
| BUG-020 | Adminer exposé publiquement | 🟡 Mineur | ❌ Ouvert |
| BUG-021 | Aucun test | 🟡 Mineur | ❌ Ouvert |
