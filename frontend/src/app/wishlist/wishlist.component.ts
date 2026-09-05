import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WishlistService } from '../services/wishlist.service';
import { CrudService } from '../services/crud.service';
import { ProductCardComponent } from '../components/product-card/product-card.component';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, ProductCardComponent],
  template: `
    <div class="wl-page">
      <header class="wl-header">
        <h1>Mes Favoris</h1>
        <div class="line-gold"></div>
        <p *ngIf="products.length">Vous avez <strong>{{ products.length }}</strong> produit{{ products.length > 1 ? 's' : '' }} enregistré{{ products.length > 1 ? 's' : '' }}.</p>
      </header>

      <section class="wl-grid container" *ngIf="products.length">
        <div class="wl-item" *ngFor="let product of products">
          <app-product-card [product]="product"></app-product-card>
          <button class="wl-remove" (click)="remove(product.id)" aria-label="Retirer des favoris">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
      </section>

      <div class="wl-empty" *ngIf="!loading && !products.length">
        <mat-icon class="wl-empty-icon">favorite_border</mat-icon>
        <h2>Votre liste de favoris est vide</h2>
        <p>Parcourez notre collection et ajoutez vos coups de cœur en un clic.</p>
        <button mat-flat-button color="primary" routerLink="/collection">DÉCOUVRIR LA COLLECTION</button>
      </div>

      <div class="wl-empty" *ngIf="loading">
        <div class="skeleton skeleton-circle" style="width:80px;height:80px;border-radius:50%;margin:0 auto 20px;"></div>
        <div class="skeleton skeleton-text" style="width:220px;margin:0 auto;"></div>
      </div>
    </div>
  `,
  styles: [`
    .wl-page { min-height: 70vh; padding-top: 120px; }
    .wl-header { text-align: center; padding: 40px 20px 0; }
    .wl-header h1 { font-family: var(--font-heading); font-size: clamp(2rem, 5vw, 3rem); color: var(--luxe-black); margin: 0; }
    .wl-header p { color: var(--luxe-text-muted); margin-top: 18px; font-weight: 300; }
    .line-gold { width: 40px; height: 1px; background: var(--luxe-gold); margin: 22px auto 0; }
    .wl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 36px; padding: 60px 0 40px; }
    .wl-item { position: relative; }
    .wl-remove {
      position: absolute; top: 10px; left: 10px; z-index: 5;
      width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer;
      background: rgba(255,255,255,0.92); box-shadow: var(--shadow-sm);
      color: var(--luxe-charcoal); display: none; align-items: center; justify-content: center;
      transition: color 0.3s ease, transform 0.3s ease;
    }
    .wl-remove mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .wl-remove:hover { color: var(--luxe-crimson); transform: scale(1.1); }
    .wl-item:hover .wl-remove { display: flex; }
    .wl-empty { text-align: center; padding: 100px 20px; }
    .wl-empty-icon { font-size: 72px; width: 72px; height: 72px; color: var(--luxe-gold); }
    .wl-empty h2 { font-family: var(--font-heading); color: var(--luxe-black); margin: 20px 0 10px; font-size: 1.6rem; }
    .wl-empty p { color: var(--luxe-text-muted); margin-bottom: 30px; font-weight: 300; }
    .container { max-width: 1440px; margin: 0 auto; padding: 0 40px; }
    @media (max-width: 960px) { .container { padding: 0 20px; } }
  `]
})
export class WishlistComponent implements OnInit {
  products: any[] = [];
  loading = true;

  constructor(
    private wishlistService: WishlistService,
    private crudService: CrudService
  ) {}

  ngOnInit() {
    this.loading = true;
    this.crudService.getAll<any>('products').subscribe({
      next: all => {
        const ids = this.wishlistService.idsList;
        this.products = all.filter(p => ids.includes(String(p.id)));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  remove(id: string) {
    this.wishlistService.remove(id);
    this.products = this.products.filter(p => String(p.id) !== id);
  }
}
