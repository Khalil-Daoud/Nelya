import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { BreadcrumbComponent, Crumb } from '../../components/breadcrumb/breadcrumb.component';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatChipsModule, MatSliderModule, FormsModule, ProductCardComponent, BreadcrumbComponent, FormatCurrencyPipe],
  template: `
    <div class="collection-page">
      <header class="collection-hero">
        <div class="container">
          <app-breadcrumb [crumbs]="breadcrumbs"></app-breadcrumb>
          <span class="collection-eyebrow">COLLECTION NELYA</span>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageSubtitle }}</p>
        </div>
      </header>

      <div class="collection-layout container">
        <!-- SIDEBAR -->
        <aside class="filter-sidebar" [class.open]="filtersOpen">
          <div class="filter-head">
            <h3>FILTRES</h3>
            <button class="filter-close" (click)="filtersOpen = false" aria-label="Fermer les filtres">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="filter-group">
            <h4 class="filter-title">Catégories</h4>
            <mat-chip-listbox (change)="onCategoryChange($event.value)" [value]="selectedCategory">
              <mat-chip-option value="all">Tout voir</mat-chip-option>
              <mat-chip-option *ngFor="let cat of categories" [value]="cat">{{cat}}</mat-chip-option>
            </mat-chip-listbox>
          </div>

          <div class="filter-group">
            <h4 class="filter-title">Prix maximum &mdash; {{maxPriceDisplay | formatCurrency:0}}</h4>
            <mat-slider [min]="priceMin" [max]="priceMax" step="5" discrete [discrete]="true">
              <input matSliderThumb [(ngModel)]="maxPriceDisplay" (ngModelChange)="applyFilters()">
            </mat-slider>
            <div class="filter-range">
              <span>{{ priceMin | formatCurrency:0 }}</span>
              <span>{{ priceMax | formatCurrency:0 }}</span>
            </div>
          </div>

          <div class="filter-promo">
            <h4>ÉDITION LIMITÉE</h4>
            <p>La sélection d'exception Nelya.</p>
            <button mat-stroked-button (click)="goTo('Promotions')">DÉCOUVRIR</button>
          </div>
        </aside>
        <div class="filter-scrim" *ngIf="filtersOpen" (click)="filtersOpen = false"></div>

        <!-- RESULTS -->
        <main class="results">
          <div class="results-toolbar">
            <p class="results-count" *ngIf="!loading">
              <strong>{{ filteredProducts.length }}</strong> produit{{ filteredProducts.length > 1 ? 's' : '' }}
            </p>
            <div class="toolbar-actions">
              <button class="mobile-filters-btn" (click)="filtersOpen = true">
                <mat-icon>tune</mat-icon> FILTRES <span class="filter-dot" *ngIf="activeFilterCount"></span>
              </button>
              <div class="sort-wrap">
                <label for="sortSelect">Trier</label>
                <select id="sortSelect" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()" aria-label="Trier les produits">
                  <option value="featured">Recommandés</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                  <option value="name-asc">Nom (A &rarr; Z)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Skeletons -->
          <div class="products-grid" *ngIf="loading">
            <div class="pcard-skeleton" *ngFor="let _ of [1,2,3,4,5,6]">
              <div class="skeleton skeleton-media"></div>
              <div class="skeleton skeleton-line" style="width:40%"></div>
              <div class="skeleton skeleton-line" style="width:70%"></div>
              <div class="skeleton skeleton-line" style="width:50%"></div>
            </div>
          </div>

          <!-- Empty -->
          <div class="results-empty" *ngIf="!loading && filteredProducts.length === 0">
            <mat-icon>search_off</mat-icon>
            <h3>Aucun produit trouvé</h3>
            <p>Essayez d'élargir vos critères de recherche ou de réinitialiser les filtres.</p>
            <button mat-flat-button color="primary" (click)="resetFilters()">RÉINITIALISER LES FILTRES</button>
          </div>

          <!-- Grid -->
          <div class="products-grid" *ngIf="!loading && filteredProducts.length">
            <app-product-card *ngFor="let product of visibleProducts" [product]="product"></app-product-card>
          </div>

          <div class="see-more" *ngIf="!loading && filteredProducts.length > visibleCount">
            <p>{{ visibleCount }} sur {{ filteredProducts.length }} produits</p>
            <button mat-stroked-button (click)="showMore()">VOIR PLUS DE PRODUITS</button>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .collection-page { min-height: 80vh; }

    .collection-hero { padding: 130px 0 50px; background: var(--luxe-offwhite); border-bottom: 1px solid var(--luxe-border); }
    .collection-hero .container { padding-top: 10px; }
    .collection-eyebrow { display: block; font-size: 0.72rem; letter-spacing: 5px; color: var(--luxe-gold); font-weight: 600; text-transform: uppercase; margin: 18px 0 12px; }
    .collection-hero h1 { font-family: var(--font-heading); font-size: clamp(2.4rem, 5vw, 3.6rem); color: var(--luxe-black); margin: 0; font-weight: 500; }
    .collection-hero p { color: var(--luxe-text-muted); font-weight: 300; margin-top: 12px; }

    .collection-layout { display: grid; grid-template-columns: 280px 1fr; gap: 70px; padding: 60px 0 40px; align-items: start; }

    /* Sidebar */
    .filter-sidebar { position: sticky; top: 100px; display: flex; flex-direction: column; gap: 10px; }
    .filter-head { display: none; }
    .filter-group { padding: 26px 0; border-bottom: 1px solid var(--luxe-border); }
    .filter-title { font-family: var(--font-heading); font-size: 1.15rem; margin: 0 0 20px; color: var(--luxe-charcoal); font-weight: 500; }
    .filter-range { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--luxe-text-muted); margin-top: 8px; }
    .filter-promo {
      margin-top: 20px; padding: 34px 24px; text-align: center; border-radius: var(--radius-lg);
      color: var(--luxe-white); background: var(--luxe-black);
      background-image: linear-gradient(rgba(10,10,10,0.6), rgba(10,10,10,0.7)), url('https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=500');
      background-size: cover; background-position: center;
    }
    .filter-promo h4 { font-size: 0.72rem; letter-spacing: 3px; color: var(--luxe-gold); margin-bottom: 12px; font-weight: 600; }
    .filter-promo p { font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 22px; line-height: 1.4; }
    .filter-promo button { border-color: var(--luxe-white); color: var(--luxe-white); font-size: 0.7rem; letter-spacing: 2px; }
    .filter-promo button:hover { background: var(--luxe-gold); border-color: var(--luxe-gold); color: var(--luxe-black); }

    /* Toolbar */
    .results-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 34px; flex-wrap: wrap; }
    .results-count { color: var(--luxe-text-muted); font-weight: 300; margin: 0; font-size: 0.9rem; }
    .results-count strong { color: var(--luxe-black); font-weight: 600; }
    .toolbar-actions { display: flex; align-items: center; gap: 18px; }
    .mobile-filters-btn {
      display: none; align-items: center; gap: 8px;
      background: none; border: 1px solid var(--luxe-border); border-radius: var(--radius-pill);
      padding: 10px 18px; font-size: 0.72rem; letter-spacing: 2px; font-weight: 600; cursor: pointer;
      color: var(--luxe-charcoal); position: relative;
    }
    .filter-dot { position: absolute; top: 6px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--luxe-gold); }
    .sort-wrap { display: flex; align-items: center; gap: 10px; }
    .sort-wrap label { font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: var(--luxe-text-muted); font-weight: 600; }
    .sort-wrap select {
      padding: 10px 14px; border: 1px solid var(--luxe-border); border-radius: var(--radius-sm);
      background: var(--luxe-white); color: var(--luxe-charcoal); font-family: var(--font-body);
      font-size: 0.85rem; outline: none; cursor: pointer; transition: border-color 0.3s ease;
    }
    .sort-wrap select:focus { border-color: var(--luxe-gold); }

    /* Grid */
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 34px; }
    .pcard-skeleton { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-media { aspect-ratio: 4 / 5; border-radius: var(--radius-lg); }

    /* Empty */
    .results-empty { text-align: center; padding: 90px 20px; }
    .results-empty mat-icon { font-size: 60px; width: 60px; height: 60px; color: var(--luxe-gold); }
    .results-empty h3 { font-family: var(--font-heading); color: var(--luxe-black); margin: 18px 0 8px; font-size: 1.4rem; }
    .results-empty p { color: var(--luxe-text-muted); margin-bottom: 28px; font-weight: 300; }

    /* See more */
    .see-more { text-align: center; margin-top: 56px; }
    .see-more p { color: var(--luxe-text-muted); font-size: 0.85rem; margin-bottom: 16px; }
    .see-more button { padding: 0 40px; height: 52px; letter-spacing: 2px; }

    .filter-scrim { display: none; }

    .container { max-width: 1440px; margin: 0 auto; padding: 0 40px; }

    @media (max-width: 960px) {
      .collection-hero { padding: 110px 0 40px; }
      .collection-layout { grid-template-columns: 1fr; gap: 0; padding: 34px 0 30px; }
      .container { padding: 0 20px; }
      .mobile-filters-btn { display: inline-flex; }
      .toolbar-actions { justify-content: space-between; width: 100%; }
      .filter-sidebar {
        position: fixed; top: 0; right: 0; bottom: 0; z-index: 1100; width: min(340px, 86vw);
        background: var(--luxe-white); padding: 24px; overflow-y: auto;
        box-shadow: var(--shadow-modal); transform: translateX(100%); transition: transform 0.35s ease;
        display: flex; flex-direction: column; gap: 0;
      }
      .filter-sidebar.open { transform: translateX(0); }
      .filter-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--luxe-border); padding-bottom: 18px; }
      .filter-head h3 { font-family: var(--font-heading); margin: 0; color: var(--luxe-black); letter-spacing: 2px; }
      .filter-close { background: none; border: none; cursor: pointer; color: var(--luxe-charcoal); display: flex; }
      .filter-scrim { display: block; position: fixed; inset: 0; background: rgba(10,10,10,0.45); z-index: 1050; }
    }
  `]
})
export class CollectionComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  visibleProducts: any[] = [];
  categories: string[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';
  sortBy: string = 'featured';
  priceMin: number = 0;
  priceMax: number = 200;
  maxPriceDisplay: number = 200;
  loading = true;
  filtersOpen = false;
  private pageSize = 9;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crud: CrudService
  ) {}

  get pageTitle(): string {
    return this.selectedCategory === 'all' ? 'La Boutique' : this.selectedCategory;
  }

  get pageSubtitle(): string {
    return this.selectedCategory === 'all'
      ? 'Explorez notre gamme complète de soins d\'exception.'
      : `Notre sélection dans la catégorie ${this.selectedCategory}.`;
  }

  get breadcrumbs() {
    const crumbs: Crumb[] = [{ label: 'Boutique', url: '/collection' }];
    if (this.selectedCategory !== 'all') crumbs.push({ label: this.selectedCategory });
    return crumbs;
  }

  get visibleCount(): number {
    return this.visibleProducts.length;
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.selectedCategory !== 'all') n++;
    if (this.maxPriceDisplay < this.priceMax) n++;
    if (this.searchTerm) n++;
    return n;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['q'] !== undefined) this.searchTerm = params['q'];
      if (params['cat'] !== undefined) this.selectedCategory = params['cat'];
      if (this.products.length) {
        this.applyFilters();
      } else {
        this.loadProducts();
      }
    });
  }

  loadProducts() {
    this.loading = true;
    this.crud.getAll<any>('categories').subscribe({
      next: categories => { this.categories = categories.map((c: any) => c.name); },
      error: () => { this.categories = []; }
    });
    this.crud.getAll<any>('products').subscribe({
      next: data => {
        this.products = data;
        const max = Math.max(...data.map((p: any) => p.price), 0);
        this.priceMax = Math.ceil(max / 10) * 10;
        this.maxPriceDisplay = this.priceMax;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onCategoryChange(cat: string) {
    this.selectedCategory = cat || 'all';
    this.applyFilters();
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    const max = this.maxPriceDisplay;
    this.filteredProducts = this.products.filter(p => {
      const catMatch = this.selectedCategory === 'all' || p.category === this.selectedCategory;
      const priceMatch = p.price <= max;
      const termMatch = !term || p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);
      return catMatch && priceMatch && termMatch;
    });

    switch (this.sortBy) {
      case 'price-asc': this.filteredProducts.sort((a, b) => a.price - b.price); break;
      case 'price-desc': this.filteredProducts.sort((a, b) => b.price - a.price); break;
      case 'name-asc': this.filteredProducts.sort((a, b) => String(a.name).localeCompare(String(b.name))); break;
      default: break;
    }

    this.visibleProducts = this.filteredProducts.slice(0, this.pageSize);
  }

  showMore() {
    this.visibleProducts = this.filteredProducts.slice(0, this.visibleProducts.length + this.pageSize);
  }

  resetFilters() {
    this.selectedCategory = 'all';
    this.searchTerm = '';
    this.maxPriceDisplay = this.priceMax;
    this.sortBy = 'featured';
    this.applyFilters();
    this.router.navigate(['/collection']);
  }

  goTo(cat: string) {
    this.router.navigate(['/collection'], { queryParams: { cat } });
  }
}
