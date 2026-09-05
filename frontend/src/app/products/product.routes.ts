import { Routes } from '@angular/router';
import { ProductDetailComponent } from './product-detail/product-detail.component';

export const PRODUCT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./collection/collection.component').then(m => m.CollectionComponent) },
  { path: ':id', component: ProductDetailComponent }
];
