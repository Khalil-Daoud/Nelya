import { Routes } from '@angular/router';
import { RoleGuard } from '../role.guard';
import { AdminLayoutComponent } from './admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'products', loadComponent: () => import('./products-manager/products-manager.component').then(m => m.ProductsManagerComponent) },
      { path: 'stock', loadComponent: () => import('./stock-manager/stock-manager.component').then(m => m.StockManagerComponent) },
      { path: 'categories', loadComponent: () => import('./categories-manager/categories-manager.component').then(m => m.CategoriesManagerComponent) },
      { path: 'orders', loadComponent: () => import('./orders-manager/orders-manager.component').then(m => m.OrdersManagerComponent) },
      {
        path: 'reviews',
        loadComponent: () => import('./reviews-manager/reviews-manager.component').then(m => m.ReviewsManagerComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'seller'], permission: 'reviews.manage' }
      },
      {
        path: 'historique',
        loadComponent: () => import('./audit-log/audit-log.component').then(m => m.AuditLogComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'seller'], permission: 'audit.view' }
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./client-fiche/client-fiche.component').then(m => m.ClientFicheComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'clients',
        loadComponent: () => import('./users-manager/users-manager.component').then(m => m.UsersManagerComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin'], mode: 'client' }
      },
      {
        path: 'employees',
        loadComponent: () => import('./users-manager/users-manager.component').then(m => m.UsersManagerComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin'], mode: 'employee' }
      },
      { path: 'users', redirectTo: 'clients', pathMatch: 'full' },
      {
        path: 'settings',
        loadComponent: () => import('./admin-settings.component').then(m => m.AdminSettingsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
