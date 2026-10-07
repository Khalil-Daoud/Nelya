import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, switchMap, takeUntil, tap } from 'rxjs';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';
import { PaginationComponent } from '../../components/pagination/pagination.component';

interface StockSummary {
  skuCount: number;
  units: number;
  outOfStock: number;
  lowStock: number;
  lowThreshold: number;
}

@Component({
  selector: 'app-products-manager',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    ImageUrlPipe,
    FormatCurrencyPipe,
    PaginationComponent
  ],
  template: `
    <div class="products-page fade-in">
      <div class="page-head">
        <div>
          <h2>Produits</h2>
          <p>Fiches, photos et prix. Le stock se règle à part, sans ouvrir chaque fiche.</p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button routerLink="/admin/stock" *ngIf="!showForm">
            <mat-icon>warehouse</mat-icon> Gérer le stock
          </a>
          <button mat-stroked-button color="primary" (click)="toggleImport()" *ngIf="!showForm">
            <mat-icon>upload_file</mat-icon> {{ showImport ? 'Fermer' : 'Importer' }}
          </button>
          <button mat-raised-button color="primary" (click)="toggleForm()" *ngIf="!showForm">
            <mat-icon>add</mat-icon> Ajouter un produit
          </button>
          <button mat-raised-button color="accent" (click)="toggleForm()" *ngIf="showForm">
            <mat-icon>close</mat-icon> Annuler
          </button>
        </div>
      </div>

      <div class="kpis" *ngIf="!showForm">
        <div class="kpi">
          <span class="kpi-label">Articles</span>
          <span class="kpi-value">{{ summary.skuCount }}</span>
        </div>
        <div class="kpi mute">
          <span class="kpi-label">Catégories</span>
          <span class="kpi-value">{{ categories.length }}</span>
        </div>
        <div class="kpi danger">
          <span class="kpi-label">Rupture</span>
          <span class="kpi-value">{{ summary.outOfStock }}</span>
        </div>
        <div class="kpi warn">
          <span class="kpi-label">Stock faible</span>
          <span class="kpi-value">{{ summary.lowStock }}</span>
        </div>
      </div>

      <mat-card class="form-card" *ngIf="showImport && !showForm">
        <mat-card-header>
          <mat-card-title>Importer un catalogue</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="import-help">
            Colonnes :
            <code>Ref</code>, <code>Catégorie</code>, <code>Désignation</code>,
            <code>Contenance</code>, <code>Prix</code>, <code>Image</code>
            (<code>Stock</code> et <code>Description</code> facultatives).
            Excel : <em>Fichier → Enregistrer sous → CSV UTF-8</em>.
          </p>
          <ul class="import-rules">
            <li>Un CSV ne peut pas contenir les photos elles-mêmes : seulement un nom de fichier ou un lien.</li>
            <li>Pour envoyer les images : zippez le CSV avec les photos, et mettez le nom du fichier dans la colonne <strong>Image</strong> (ex. <code>deodorant.jpg</code>).</li>
            <li>Les catégories absentes sont créées. Une Ref déjà connue met le produit à jour.</li>
          </ul>

          <div class="import-actions">
            <mat-form-field appearance="outline" class="stock-field">
              <mat-label>Stock par défaut</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="defaultStock" [ngModelOptions]="{ standalone: true }">
              <mat-hint>Si la colonne Stock est vide</mat-hint>
            </mat-form-field>

            <input type="file" hidden #csvInput accept=".csv,.txt,.zip,text/csv,application/zip" (change)="onCsvSelected($event)">
            <button mat-flat-button color="primary" [disabled]="importing" (click)="csvInput.click()">
              <mat-icon>upload_file</mat-icon>
              {{ importing ? 'Import en cours…' : 'Choisir CSV ou ZIP' }}
            </button>
            <mat-spinner *ngIf="importing" diameter="24"></mat-spinner>
            <button mat-stroked-button (click)="downloadTemplate()">
              <mat-icon>download</mat-icon> Modèle CSV
            </button>
          </div>
          <p class="import-file" *ngIf="importFileName">Fichier : {{ importFileName }}</p>

          <div class="import-report" *ngIf="importReport">
            <p class="report-summary">
              <strong>{{ importReport.created }}</strong> créé(s) ·
              <strong>{{ importReport.updated }}</strong> mis à jour ·
              <strong>{{ importReport.skipped }}</strong> ignoré(s)
              sur {{ importReport.total }} ligne(s)
              <ng-container *ngIf="importReport.imagesImported">
                · <strong>{{ importReport.imagesImported }}</strong> photo(s) extraite(s) du ZIP
              </ng-container>
            </p>
            <p *ngIf="importReport.categoriesCreated?.length">
              Catégories créées : {{ importReport.categoriesCreated.join(', ') }}
            </p>
            <div class="report-errors" *ngIf="importReport.errors?.length">
              <p>Lignes ignorées :</p>
              <ul>
                <li *ngFor="let e of importReport.errors">Ligne {{ e.line }} — {{ e.message }}</li>
              </ul>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="form-card" *ngIf="showForm">
        <mat-card-header>
          <mat-card-title>{{ isEditMode ? 'Modifier le produit' : 'Nouveau produit' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Référence</mat-label>
                <input matInput formControlName="reference" placeholder="ex: NEL-001">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nom du produit</mat-label>
                <input matInput formControlName="name" placeholder="ex: Crème de Nuit">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contenance</mat-label>
                <input matInput formControlName="contenance" placeholder="ex: 50 ml">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Catégorie</mat-label>
                <mat-select formControlName="category">
                  <mat-option *ngFor="let c of categories" [value]="c.name">{{ c.name }}</mat-option>
                </mat-select>
                <mat-hint *ngIf="categories.length === 0">
                  Aucune catégorie — <a routerLink="/admin/categories">créez-en une</a>
                </mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Prix</mat-label>
                <input matInput type="number" formControlName="price" placeholder="ex: 25.00">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Stock</mat-label>
                <input matInput type="number" formControlName="stock" placeholder="ex: 50">
              </mat-form-field>
            </div>

            <div class="image-field full-width">
              <span class="image-label">Image du produit</span>
              <div class="image-actions">
                <input type="file" hidden #fileInput accept="image/*" (change)="onFileSelected($event)">
                <button type="button" mat-stroked-button color="primary" [disabled]="uploading" (click)="fileInput.click()">
                  <mat-icon>upload</mat-icon>
                  {{ uploading ? 'Envoi en cours…' : 'Choisir une image' }}
                </button>
                <mat-spinner *ngIf="uploading" diameter="20"></mat-spinner>
                <img *ngIf="!uploading && imagePreview" [src]="imagePreview | imageUrl" class="image-preview" alt="Aperçu">
              </div>
              <mat-form-field appearance="outline" class="full-width" style="margin-top: 10px;">
                <mat-label>URL de l'image</mat-label>
                <input matInput formControlName="image_url" placeholder="/img/… ou https://…">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="4"></textarea>
            </mat-form-field>

            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="productForm.invalid">
                <mat-icon>save</mat-icon> Enregistrer
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="table-wrap" *ngIf="!showForm">
        <div class="toolbar">
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
          <span class="result-count">{{ total }} produit{{ total > 1 ? 's' : '' }}</span>
        </div>

        <div class="rows" *ngIf="products.length; else empty">
          <div class="row head">
            <span></span>
            <span>Produit</span>
            <span>Prix</span>
            <span>Stock</span>
            <span></span>
          </div>
          <div class="row" *ngFor="let p of products">
            <img [src]="p.image_url | imageUrl" [alt]="p.name" class="thumb">
            <div class="meta">
              <strong>{{ p.name }}</strong>
              <span>{{ p.reference || 'Sans réf.' }} · {{ p.category || '—' }}<ng-container *ngIf="p.contenance"> · {{ p.contenance }}</ng-container></span>
            </div>
            <span class="price">{{ p.price | formatCurrency }}</span>
            <span class="badge" [ngClass]="statusClass(p.stock)">{{ statusLabel(p.stock) }} · {{ p.stock }}</span>
            <div class="row-actions">
              <button type="button" mat-icon-button color="primary" matTooltip="Modifier" (click)="editProduct(p)">
                <mat-icon>edit</mat-icon>
              </button>
              <button type="button" mat-icon-button color="warn" matTooltip="Supprimer" (click)="deleteProduct(p.id)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <ng-template #empty>
          <div class="empty" *ngIf="!loading">
            <mat-icon>inventory_2</mat-icon>
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        </ng-template>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="total"
          (pageChange)="onPageChange($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .products-page { width: 100%; min-width: 0; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 26px; flex-wrap: wrap; }
    .page-head h2 { margin: 0 0 6px; font-family: var(--font-heading); font-size: clamp(1.6rem, 3vw, 2rem); font-weight: 500; }
    .page-head p { margin: 0; color: var(--luxe-text-muted); font-weight: 300; font-size: 0.9rem; max-width: 560px; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
    .kpi {
      text-align: left; padding: 18px 20px; border-radius: 14px; min-width: 0;
      background: var(--luxe-white); border: 1px solid var(--luxe-border);
    }
    .kpi-label { display: block; font-size: 0.75rem; color: var(--luxe-text-muted); letter-spacing: 0.4px; margin-bottom: 6px; }
    .kpi-value { font-family: var(--font-heading); font-size: 1.7rem; color: var(--luxe-black); }
    .kpi.danger .kpi-value { color: #b42318; }
    .kpi.warn .kpi-value { color: #b54708; }

    .form-card { border-radius: 16px; padding: 12px 8px 8px; margin-bottom: 22px; }
    .full-width { width: 100%; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 15px; }
    .image-field { margin-bottom: 15px; }
    .image-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--luxe-text-muted); display: block; margin-bottom: 8px; font-weight: 600; }
    .image-actions { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
    .image-preview { width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 1px solid var(--luxe-border); }

    .import-help { color: var(--luxe-text-muted); font-size: 0.9rem; line-height: 1.7; }
    .import-help code, .import-rules code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
    .import-rules { color: var(--luxe-text-muted); font-size: 0.85rem; line-height: 1.8; margin: 0 0 18px; padding-left: 20px; }
    .import-actions { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .stock-field { width: 200px; max-width: 100%; }
    .import-file { margin: 8px 0 0; font-size: 0.82rem; color: var(--luxe-text-muted); }
    .import-report { margin-top: 24px; padding: 16px; border-radius: 10px; border: 1px solid var(--luxe-border); }
    .report-summary { margin: 0 0 8px; }
    .report-errors { margin-top: 12px; color: var(--luxe-crimson); font-size: 0.85rem; }
    .report-errors ul { margin: 6px 0 0; padding-left: 20px; line-height: 1.7; }

    .table-wrap {
      min-width: 0; background: var(--luxe-white);
      border: 1px solid var(--luxe-border); border-radius: 16px; overflow: hidden;
    }
    .toolbar {
      display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
      padding: 16px 18px 4px;
    }
    .search { flex: 1; min-width: 180px; }
    .cat { width: 200px; max-width: 100%; }
    .result-count { color: var(--luxe-text-muted); font-size: 0.85rem; margin-left: auto; }

    .rows { width: 100%; }
    .row {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr) 110px 150px 88px;
      gap: 14px;
      align-items: center;
      padding: 10px 18px;
      border-top: 1px solid var(--luxe-border);
    }
    .row.head {
      border-top: none;
      padding-top: 6px;
      padding-bottom: 8px;
      font-size: 0.7rem;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      color: var(--luxe-text-muted);
      font-weight: 700;
    }
    .thumb { width: 52px; height: 64px; object-fit: cover; border-radius: 8px; background: var(--luxe-offwhite); }
    .meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .meta strong { font-size: 0.95rem; color: var(--luxe-black); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta span { font-size: 0.78rem; color: var(--luxe-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price { font-weight: 600; white-space: nowrap; }
    .row-actions { display: flex; justify-content: flex-end; }

    .badge {
      display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; padding: 5px 10px; border-radius: 999px; white-space: nowrap;
    }
    .badge.ok { background: #ecfdf3; color: #067647; }
    .badge.low { background: #fffaeb; color: #b54708; }
    .badge.out { background: #fef3f2; color: #b42318; }

    .empty {
      text-align: center; padding: 56px 20px; color: var(--luxe-text-muted);
    }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--luxe-gold); margin-bottom: 10px; }

    @media (max-width: 1100px) {
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .page-head { align-items: stretch; }
      .header-actions { width: 100%; }
      .header-actions a, .header-actions button { flex: 1; }
      .cat { width: 100%; }
      .result-count { margin-left: 0; width: 100%; }
      .row { grid-template-columns: 52px 1fr auto; }
      .row.head { display: none; }
      .price, .badge, .row-actions { grid-column: 2; justify-self: start; }
    }
    @media (max-width: 480px) {
      .kpis { grid-template-columns: 1fr 1fr; gap: 10px; }
      .kpi { padding: 14px; }
      .kpi-value { font-size: 1.35rem; }
    }
  `]
})
export class ProductsManagerComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  summary: StockSummary = { skuCount: 0, units: 0, outOfStock: 0, lowStock: 0, lowThreshold: 10 };
  total = 0;
  loading = true;
  searchTerm = '';
  categoryFilter = 'all';
  pageIndex = 0;
  pageSize = 10;
  private lowThreshold = 10;

  private searchChange$ = new Subject<void>();
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  productForm!: FormGroup;
  showForm = false;
  isEditMode = false;
  editingProductId: string | null = null;
  uploading = false;
  imagePreview = '';

  showImport = false;
  importing = false;
  defaultStock = 100;
  importReport: any = null;
  importFileName = '';

  constructor(
    private crud: CrudService,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.reload$.next());

    this.reload$
      .pipe(
        tap(() => { this.loading = true; }),
        switchMap(() => this.crud.getPage<any>('products', {
          page: this.pageIndex + 1,
          limit: this.pageSize,
          search: this.searchTerm.trim() || undefined,
          category: this.categoryFilter === 'all' ? undefined : this.categoryFilter,
          sort: 'newest:desc'
        })),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: page => {
          this.products = page.data;
          this.total = page.total;
          this.loading = false;
          if (page.data.length === 0 && this.pageIndex > 0) {
            this.pageIndex = Math.max(0, page.pages - 1);
            this.reload$.next();
          }
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Erreur lors du chargement des produits', 'Fermer', { duration: 4000 });
        }
      });

    this.loadProducts();
    this.loadCategories();
    this.loadSummary();
    this.initForm();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories() {
    this.crud.getAll<any>('categories').subscribe({
      next: data => this.categories = data,
      error: () => this.snackBar.open('Erreur lors du chargement des catégories', 'Fermer', { duration: 4000 })
    });
  }

  loadSummary() {
    this.api.get<StockSummary>('products/stock-summary', { low: this.lowThreshold }).subscribe({
      next: s => this.summary = s,
      error: () => {}
    });
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

  initForm() {
    this.productForm = this.fb.group({
      reference: [''],
      contenance: [''],
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      image_url: ['', Validators.required],
      description: ['']
    });
  }

  get imageValue(): string {
    return this.productForm?.get('image_url')?.value || '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    this.uploading = true;
    this.api.post<{ url: string }>('uploads', formData).subscribe({
      next: (res) => {
        this.uploading = false;
        this.imagePreview = res.url;
        this.productForm.patchValue({ image_url: res.url });
        this.snackBar.open('Image envoyée avec succès', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.uploading = false;
        const msg = err?.error?.message || "Erreur lors de l'envoi de l'image";
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      }
    });
    input.value = '';
  }

  loadProducts() {
    this.reload$.next();
  }

  resetPage() {
    this.pageIndex = 0;
    this.searchChange$.next();
  }

  onPageChange(index: number) {
    this.pageIndex = index;
    this.reload$.next();
  }

  toggleImport() {
    this.showImport = !this.showImport;
    if (!this.showImport) {
      this.importReport = null;
      this.importFileName = '';
    }
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName = file.name;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('default_stock', String(this.defaultStock ?? 0));

    this.importing = true;
    this.importReport = null;
    this.api.post<any>('products/import', formData).subscribe({
      next: (report) => {
        this.importing = false;
        this.importReport = report;
        this.loadProducts();
        this.loadCategories();
        this.loadSummary();
        this.snackBar.open(
          `${report.created} produit(s) créé(s), ${report.updated} mis à jour`,
          'OK',
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.importing = false;
        const msg = err?.error?.message || "Erreur lors de l'import du fichier";
        this.snackBar.open(msg, 'Fermer', { duration: 6000 });
      }
    });
    input.value = '';
  }

  downloadTemplate() {
    const rows = [
      'Ref;Categorie;Designation;Contenance;Prix;Image;Stock',
      'NEL-001;Soins Visage;Crème de Nuit Régénérante;50 ml;89,900;creme-nuit.jpg;25',
      'NEL-002;Parfums;Eau de Parfum Oud;100 ml;149,000;https://exemple.com/parfum.jpg;10'
    ];
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele-import-produits.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.isEditMode = false;
      this.editingProductId = null;
      this.imagePreview = '';
      this.productForm.reset({ stock: 0 });
    }
  }

  editProduct(product: any) {
    this.isEditMode = true;
    this.editingProductId = product.id;
    this.showForm = true;
    this.showImport = false;
    this.imagePreview = product.image_url;
    this.productForm.patchValue({
      reference: product.reference,
      contenance: product.contenance,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      description: product.description
    });
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    const payload = this.productForm.value;

    if (this.isEditMode && this.editingProductId) {
      this.crud.update('products', this.editingProductId, payload).subscribe({
        next: () => {
          this.snackBar.open('Produit mis à jour avec succès', 'OK', { duration: 3000 });
          this.loadProducts();
          this.loadSummary();
          this.toggleForm();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la mise à jour du produit', 'Fermer', { duration: 3000 });
        }
      });
    } else {
      this.crud.create('products', payload).subscribe({
        next: () => {
          this.snackBar.open('Produit créé avec succès', 'OK', { duration: 3000 });
          this.loadProducts();
          this.loadCategories();
          this.loadSummary();
          this.toggleForm();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la création du produit', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  deleteProduct(id: string) {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      this.crud.delete('products', id).subscribe({
        next: () => {
          this.snackBar.open('Produit supprimé', 'OK', { duration: 3000 });
          this.loadProducts();
          this.loadSummary();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression du produit', 'Fermer', { duration: 3000 });
        }
      });
    }
  }
}
