# Nelya - E-commerce Professionnel

Application full-stack pour la vente de produits esthétiques (cosmétiques, soins, parfums, accessoires).

## Architecture Dynamic CRUD
Ce projet utilise une architecture **Dynamic CRUD** pour maximiser la réutilisabilité du code :
- **Backend** : `BaseController` et `BaseService` gèrent les opérations standard pour toutes les entités Sequelize. Le `createDynamicRouter` permet d'ajouter un CRUD complet en une seule ligne.
- **Frontend** : Un `CrudService` générique permet d'accéder à n'importe quelle entité du backend.

## Stack Technique
- **Frontend** : Angular 17, Angular Material, Standalone Components.
- **Backend** : Node.js, Express, Sequelize ORM.
- **Base de données** : PostgreSQL.
- **Containerisation** : Docker, Docker Compose.
- **Authentification** : JWT avec rôles (admin, seller, client).

## Installation et Lancement

### Avec Docker (Recommandé)
1. Assurez-vous que Docker et Docker Compose sont installés.
2. À la racine du projet, lancez :
   ```bash
   docker-compose -f docker/docker-compose.yml up --build
   ```
3. Accédez à l'application :
   - Frontend : `http://localhost:4200`
   - Backend API : `http://localhost:3000/api`
   - Health Check : `http://localhost:3000/health`

### Développement Local
1. **Backend** :
   ```bash
   cd backend
   npm install
   npm run dev
   ```
2. **Frontend** :
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Fonctionnalités
- Gestion dynamique des produits, catégories et utilisateurs.
- Authentification complète (Inscription, Connexion, Profil).
- Panier d'achat (Service prêt).
- Dashboard Administration (Structure prête).
- Structure prête pour intégration Stripe.
