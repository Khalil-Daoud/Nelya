import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, switchMap, takeUntil, tap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';
import { PaginationComponent } from '../../components/pagination/pagination.component';

type StockFilter = 'all' | 'out' | 'low' | 'ok';

interface StockSummary {
  skuCount: number;
  units: number;
  outOfStock: number;
  lowStock: number;
  lowThreshold: number;
}

@Component({
  selector: 'app-stock-manager',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTooltipModule, ImageUrlPipe, PaginationComponent
  ],
  template: `
    <div class="stock-page fade-in">
      <div class="page-head">
        <div>
          <h2>Stock</h2>
          <p>Ajustez les quantités sans ouvrir la fiche produit. Les commandes décrémentent automatiquement.</p>
        </div>
        <a mat-stroked-button routerLink="/admin/products">
          <mat-icon>inventory_2</mat-icon> Fiches produits
        </a>
      </div>

      <div class="kpis">
        <button type="button" class="kpi" [class.on]="filter === 'all'" (click)="setFilter('all')">
          <span class="kpi-label">Articles</span>
          <span class="kpi-value">{{ summary.skuCount }}</span>
        </button>
        <div class="kpi mute">
          <span class="kpi-label">Unités</span>
          <span class="kpi-value">{{ summary.units }}</span>
        </div>
        <button type="button" class="kpi danger" [class.on]="filter === 'out'" (click)="setFilter('out')">
          <span class="kpi-label">Rupture</span>
          <span class="kpi-value">{{ summary.outOfStock }}</span>
        </button>
        <button type="button" class="kpi warn" [class.on]="filter === 'low'" (click)="setFilter('low')">
          <span class="kpi-label">Stock faible (≤ {{ lowThreshold }})</span>
          <span class="kpi-value">{{ summary.lowStock }}</span>
        </button>
      </div>

      <div class="panel">
        <div class="toolbar">
          <div class="tabs">
            <button type="button" class="tab" [class.on]="filter === 'all'" (click)="setFilter('all')">Tous</button>
            <button type="button" class="tab" [class.on]="filter === 'out'" (click)="setFilter('out')">Rupture</button>
            <button type="button" class="tab" [class.on]="filter === 'low'" (click)="setFilter('low')">Faible</button>
            <button type="button" class="tab" [class.on]="filter === 'ok'" (click)="setFilter('ok')">Disponible</button>
          </div>

          <mat-form-field appearance="outline" class="search">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>Rechercher</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Nom, référence…">
          </mat-form-field>

          <mat-form-field appearance="outline" class="cat">
            <mat-label>Catégorie</mat-label>
            <mat-select [(ngModel)]="categoryFilter" (ngModelChange)="resetPage()">
              <mat-option value="all">Toutes</mat-option>
              <mat-option *ngFor="let c of categories" [value]="c.name">{{ c.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="threshold">
            <mat-label>Seuil faible</mat-label>
            <input matInput type="number" min="1" max="100" [(ngModel)]="lowThreshold" (ngModelChange)="onThresholdChange()">
          </mat-form-field>
        </div>

        <div class="rows" *ngIf="products.length; else empty">
          <div class="row" *ngFor="let p of products">
            <img [src]="p.image_url | imageUrl" [alt]="p.name" class="thumb">
            <div class="meta">
              <strong>{{ p.name }}</strong>
              <span>{{ p.reference || 'Sans réf.' }} · {{ p.category || '—' }}{{ p.contenance ? ' · ' + p.contenance : '' }}</span>
            </div>
            <span class="badge" [ngClass]="statusClass(p.stock)">{{ statusLabel(p.stock) }}</span>
            <div class="stepper">
              <button type="button" (click)="adjust(p, -1)" [disabled]="savingId === p.id || p.stock <= 0" aria-label="Retirer une unité">−</button>
              <input
                type="number"
                min="0"
                [ngModel]="draft[p.id] ?? p.stock"
                (ngModelChange)="draft[p.id] = $event"
                (blur)="commit(p)"
                (keydown.enter)="commit(p)"
                [disabled]="savingId === p.id">
              <button type="button" (click)="adjust(p, 1)" [disabled]="savingId === p.id" aria-label="Ajouter une unité">+</button>
            </div>
            <div class="restock">
              <input type="number" min="1" placeholder="+ lots" [(ngModel)]="addQty[p.id]" [disabled]="savingId === p.id">
              <button type="button" matTooltip="Ajouter ce lot" (click)="restock(p)" [disabled]="savingId === p.id || !addQty[p.id]">
                <mat-icon>add_box</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <ng-template #empty>
          <div class="empty" *ngIf="!loading">
            <mat-icon>inventory_2</mat-icon>
            <p>Aucun article dans ce filtre.</p>
          </div>
        </ng-template>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="total"
          (pageChange)="onPageChange($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .stock-page { width: 100%; min-width: 0; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 26px; flex-wrap: wrap; }
    .page-head h2 { margin: 0 0 6px; font-family: var(--font-heading); font-size: 2rem; font-weight: 500; }
    .page-head p { margin: 0; color: var(--luxe-text-muted); font-weight: 300; font-size: 0.9rem; max-width: 520px; }

    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
    .kpi {
      text-align: left; padding: 18px 20px; border-radius: 14px; cursor: pointer;
      background: var(--luxe-white); border: 1px solid var(--luxe-border);
      font-family: var(--font-body); transition: border-color 0.2s ease;
    }
    .kpi.mute { cursor: default; }
    .kpi.on { border-color: var(--luxe-black); }
    .kpi-label { display: block; font-size: 0.75rem; color: var(--luxe-text-muted); letter-spacing: 0.4px; margin-bottom: 6px; }
    .kpi-value { font-family: var(--font-heading); font-size: 1.7rem; color: var(--luxe-black); }
    .kpi.danger .kpi-value { color: #b42318; }
    .kpi.warn .kpi-value { color: #b54708; }
    .kpi.danger.on { border-color: #b42318; background: #fef3f2; }
    .kpi.warn.on { border-color: #b54708; background: #fffaeb; }

    .panel { background: var(--luxe-white); border: 1px solid var(--luxe-border); border-radius: 16px; overflow-x: auto; }
    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 18px 20px 8px; }
    .tabs { display: flex; gap: 6px; }
    .tab {
      padding: 8px 14px; border-radius: 999px; border: 1px solid var(--luxe-border);
      background: #fff; cursor: pointer; font-size: 0.8rem; font-family: var(--font-body); color: var(--luxe-charcoal);
    }
    .tab.on { background: var(--luxe-black); color: #fff; border-color: var(--luxe-black); }
    .search { flex: 1; min-width: 200px; }
    .cat { width: 180px; }
    .threshold { width: 120px; }

    .row {
      display: grid; grid-template-columns: 52px 1fr auto auto auto;
      gap: 16px; align-items: center; padding: 12px 20px;
      border-top: 1px solid var(--luxe-border);
    }
    .thumb { width: 52px; height: 64px; object-fit: cover; border-radius: 8px; background: var(--luxe-offwhite); }
    .meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .meta strong { font-size: 0.95rem; color: var(--luxe-black); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta span { font-size: 0.78rem; color: var(--luxe-text-muted); }

    .badge { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
    .badge.ok { background: #ecfdf3; color: #067647; }
    .badge.low { background: #fffaeb; color: #b54708; }
    .badge.out { background: #fef3f2; color: #b42318; }

    .stepper { display: flex; align-items: center; border: 1px solid var(--luxe-border); border-radius: 999px; overflow: hidden; }
    .stepper button {
      width: 36px; height: 36px; border: none; background: var(--luxe-offwhite); cursor: pointer; font-size: 1.1rem; color: var(--luxe-black);
    }
    .stepper button:disabled { opacity: 0.4; cursor: default; }
    .stepper input {
      width: 64px; border: none; text-align: center; font-size: 0.95rem; font-weight: 600; outline: none; height: 36px;
    }

    .restock { display: flex; align-items: center; gap: 4px; }
    .restock input {
      width: 72px; padding: 8px 10px; border: 1px solid var(--luxe-border); border-radius: 8px; font-size: 0.85rem; outline: none;
    }
    .restock button {
      width: 36px; height: 36px; border: none; border-radius: 8px; background: var(--luxe-black); color: var(--luxe-gold); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .restock button:disabled { opacity: 0.35; cursor: default; }
    .restock mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .empty { text-align: center; padding: 56px 20px; color: var(--luxe-text-muted); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--luxe-gold); margin-bottom: 10px; }

    @media (max-width: 1100px) {
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .row { grid-template-columns: 52px 1fr; }
      .badge, .stepper, .restock { grid-column: 2; justify-self: start; }
      .search, .cat, .threshold { width: 100%; }
      .tabs { width: 100%; flex-wrap: wrap; }
    }
    @media (max-width: 480px) {
      .kpis { gap: 10px; }
      .kpi { padding: 14px; }
      .kpi-value { font-size: 1.35rem; }
    }
  `]
})
export class StockManagerComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  summary: StockSummary = { skuCount: 0, units: 0, outOfStock: 0, lowStock: 0, lowThreshold: 10 };
  filter: StockFilter = 'all';
  searchTerm = '';
  categoryFilter = 'all';
  lowThreshold = 10;
  pageIndex = 0;
  pageSize = 10;
  total = 0;
  loading = true;
  savingId: string | null = null;
  draft: Record<string, number> = {};
  addQty: Record<string, number | null> = {};

  private searchChange$ = new Subject<void>();
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private thresholdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private crud: CrudService,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.reload$.next());

    this.reload$
      .pipe(
        tap(() => { this.loading = true; }),
        switchMap(() => this.crud.getPage<any>('products', this.listQuery())),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: page => {
          this.products = page.data;
          this.total = page.total;
          this.loading = false;
          this.draft = {};
          if (page.data.length === 0 && this.pageIndex > 0) {
            this.pageIndex = Math.max(0, page.pages - 1);
            this.reload$.next();
          }
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Impossible de charger le stock', 'Fermer', { duration: 4000 });
        }
      });

    this.crud.getAll<any>('categories').subscribe({
      next: data => this.categories = data,
      error: () => { this.categories = []; }
    });

    this.loadSummary();
    this.reload$.next();
  }

  ngOnDestroy() {
    if (this.thresholdTimer) clearTimeout(this.thresholdTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private listQuery() {
    const query: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchTerm.trim() || undefined,
      category: this.categoryFilter === 'all' ? undefined : this.categoryFilter,
      sort: 'stock:asc'
    };
    if (this.filter === 'out') {
      query.stock_max = 0;
    } else if (this.filter === 'low') {
      query.stock_min = 1;
      query.stock_max = this.lowThreshold;
    } else if (this.filter === 'ok') {
      query.stock_min = this.lowThreshold + 1;
    }
    return query;
  }

  loadSummary() {
    this.api.get<StockSummary>('products/stock-summary', { low: this.lowThreshold }).subscribe({
      next: s => this.summary = s,
      error: () => {}
    });
  }

  setFilter(filter: StockFilter) {
    if (this.filter === filter) return;
    this.filter = filter;
    this.resetPage();
  }

  resetPage() {
    this.pageIndex = 0;
    this.searchChange$.next();
  }

  onPageChange(index: number) {
    this.pageIndex = index;
    this.reload$.next();
  }

  onThresholdChange() {
    const n = Number(this.lowThreshold);
    this.lowThreshold = Number.isFinite(n) && n >= 1 ? Math.min(100, Math.round(n)) : 10;
    if (this.thresholdTimer) clearTimeout(this.thresholdTimer);
    this.thresholdTimer = setTimeout(() => {
      this.loadSummary();
      this.resetPage();
    }, 400);
  }

  statusClass(stock: number): string {
    if (stock <= 0) return 'out';
    if (stock <= this.lowThreshold) return 'low';
    return 'ok';
  }

  statusLabel(stock: number): string {
    if (stock <= 0) return 'Rupture';
    if (stock <= this.lowThreshold) return 'Faible';
    return 'En stock';
  }

  adjust(product: any, delta: number) {
    this.patchStock(product, { delta });
  }

  restock(product: any) {
    const qty = Number(this.addQty[product.id]);
    if (!Number.isInteger(qty) || qty <= 0) return;
    this.patchStock(product, { delta: qty }, () => { this.addQty[product.id] = null; });
  }

  commit(product: any) {
    const raw = this.draft[product.id];
    if (raw === undefined || raw === null) return;
    const next = Number(raw);
    if (!Number.isInteger(next) || next < 0) {
      this.draft[product.id] = product.stock;
      this.snackBar.open('Quantité invalide', 'Fermer', { duration: 2500 });
      return;
    }
    if (next === Number(product.stock)) {
      delete this.draft[product.id];
      return;
    }
    this.patchStock(product, { stock: next });
  }

  private patchStock(product: any, body: { stock?: number; delta?: number }, after?: () => void) {
    this.savingId = product.id;
    this.api.patch<any>(`products/${product.id}/stock`, body).subscribe({
      next: updated => {
        product.stock = updated.stock;
        delete this.draft[product.id];
        this.savingId = null;
        after?.();
        this.loadSummary();
      },
      error: err => {
        this.savingId = null;
        this.draft[product.id] = product.stock;
        this.snackBar.open(err?.error?.message || 'Mise à jour du stock impossible', 'Fermer', { duration: 4000 });
      }
    });
  }
}
