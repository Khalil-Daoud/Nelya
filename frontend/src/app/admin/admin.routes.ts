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
      { path: 'categories', loadComponent: () => import('./categories-manager/categories-manager.component').then(m => m.CategoriesManagerComponent) },
      { path: 'orders', loadComponent: () => import('./orders-manager/orders-manager.component').then(m => m.OrdersManagerComponent) },
      {
        path: 'users',
        loadComponent: () => import('./users-manager/users-manager.component').then(m => m.UsersManagerComponent),
        canActivate: [RoleGuard],
        data: { roles: ['admin'] }
      },
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
