import { Routes } from '@angular/router';
import { RoleGuard } from './role.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'products',
    loadChildren: () => import('./products/product.routes').then(m => m.PRODUCT_ROUTES)
  },
  {
    path: 'collection',
    loadComponent: () => import('./products/collection/collection.component').then(m => m.CollectionComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [RoleGuard]
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./wishlist/wishlist.component').then(m => m.WishlistComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./components/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [RoleGuard],
    data: { roles: ['admin', 'seller'] }
  },
  { path: '**', loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
