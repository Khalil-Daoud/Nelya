import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
  selector: 'app-products-manager',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    MatTableModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    ImageUrlPipe,
    FormatCurrencyPipe,
    PaginationComponent
  ],
  template: `
    <div class="manager-container">
      <div class="header">
        <h2>Gestion des Produits</h2>
        <div class="header-actions">
          <button mat-stroked-button color="primary" (click)="toggleImport()" *ngIf="!showForm">
            <mat-icon>upload_file</mat-icon> {{ showImport ? 'Fermer' : 'Importer un CSV' }}
          </button>
          <button mat-raised-button color="primary" (click)="toggleForm()" *ngIf="!showForm">
            <mat-icon>add</mat-icon> Ajouter un produit
          </button>
          <button mat-raised-button color="accent" (click)="toggleForm()" *ngIf="showForm">
            <mat-icon>close</mat-icon> Annuler
          </button>
        </div>
      </div>

      <!-- Import CSV / Excel -->
      <mat-card class="form-card fade-in" *ngIf="showImport && !showForm">
        <mat-card-header>
          <mat-card-title>Importer des produits depuis un fichier CSV</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="import-help">
            Colonnes attendues :
            <code>Ref</code>, <code>Catégorie</code>, <code>Désignation</code>,
            <code>Contenance</code>, <code>Prix</code>, <code>Image</code>
            (colonnes <code>Stock</code> et <code>Description</code> facultatives).
            Dans Excel : <em>Fichier → Enregistrer sous → CSV UTF-8</em>.
          </p>
          <ul class="import-rules">
            <li>Les catégories absentes sont créées automatiquement.</li>
            <li>Une ligne dont la <strong>Ref</strong> existe déjà met le produit à jour au lieu de le dupliquer.</li>
            <li>La colonne <strong>Image</strong> accepte une URL complète ou le nom d'un fichier déjà envoyé.</li>
          </ul>

          <div class="import-actions">
            <mat-form-field appearance="outline" class="stock-field">
              <mat-label>Stock par défaut</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="defaultStock" [ngModelOptions]="{ standalone: true }">
              <mat-hint>Appliqué aux nouveaux produits sans colonne Stock</mat-hint>
            </mat-form-field>

            <input type="file" hidden #csvInput accept=".csv,text/csv" (change)="onCsvSelected($event)">
            <button mat-flat-button color="primary" [disabled]="importing" (click)="csvInput.click()">
              <mat-icon>upload_file</mat-icon>
              {{ importing ? 'Import en cours…' : 'Choisir un fichier CSV' }}
            </button>
            <mat-spinner *ngIf="importing" diameter="24"></mat-spinner>
            <button mat-stroked-button (click)="downloadTemplate()">
              <mat-icon>download</mat-icon> Télécharger un modèle
            </button>
          </div>

          <div class="import-report" *ngIf="importReport">
            <p class="report-summary">
              <strong>{{ importReport.created }}</strong> produit(s) créé(s) ·
              <strong>{{ importReport.updated }}</strong> mis à jour ·
              <strong>{{ importReport.skipped }}</strong> ignoré(s)
              sur {{ importReport.total }} ligne(s).
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

      <!-- Formulaire d'édition / création -->
      <mat-card class="form-card fade-in" *ngIf="showForm">
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
                  Aucune catégorie disponible — <a routerLink="/admin/categories">créez-en une</a>
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
                  {{ uploading ? 'Envoi en cours…' : 'Choisir une image depuis l'ordinateur' }}
                </button>
                <mat-spinner *ngIf="uploading" diameter="20"></mat-spinner>
                <img *ngIf="!uploading && imagePreview" [src]="imagePreview | imageUrl" class="image-preview" alt="Aperçu">
              </div>
              <mat-form-field appearance="outline" class="full-width" style="margin-top: 10px;">
                <mat-label>URL de l'image (automatique ou manuelle)</mat-label>
                <input matInput formControlName="image_url" placeholder="https://images.unsplash.com/...">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="4" placeholder="Description détaillée du produit..."></textarea>
            </mat-form-field>

            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="productForm.invalid">
                <mat-icon>save</mat-icon> Enregistrer
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Table des produits -->
      <mat-card class="table-card" *ngIf="!showForm">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>Rechercher un produit</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Nom ou catégorie...">
          </mat-form-field>
          <mat-form-field appearance="outline" class="cat-field">
            <mat-label>Catégorie</mat-label>
            <mat-select [(ngModel)]="categoryFilter" (ngModelChange)="resetPage()">
              <mat-option value="all">Toutes les catégories</mat-option>
              <mat-option *ngFor="let c of categories" [value]="c.name">{{ c.name }}</mat-option>
            </mat-select>
          </mat-form-field>
          <span class="result-count">{{ filteredProducts.length }} produit{{ filteredProducts.length > 1 ? 's' : '' }}</span>
        </div>

        <table mat-table [dataSource]="pagedProducts" class="full-width">
          <ng-container matColumnDef="image">
            <th mat-header-cell *matHeaderCellDef> Image </th>
            <td mat-cell *matCellDef="let p"> <img [src]="p.image_url | imageUrl" class="thumb"> </td>
          </ng-container>

          <ng-container matColumnDef="reference">
            <th mat-header-cell *matHeaderCellDef> Réf. </th>
            <td mat-cell *matCellDef="let p"> {{p.reference || '—'}} </td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Nom </th>
            <td mat-cell *matCellDef="let p"> {{p.name}} </td>
          </ng-container>

          <ng-container matColumnDef="contenance">
            <th mat-header-cell *matHeaderCellDef> Contenance </th>
            <td mat-cell *matCellDef="let p"> {{p.contenance || '—'}} </td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef> Prix </th>
            <td mat-cell *matCellDef="let p"> {{p.price | formatCurrency}} </td>
          </ng-container>

          <ng-container matColumnDef="stock">
            <th mat-header-cell *matHeaderCellDef> Stock </th>
            <td mat-cell *matCellDef="let p"> {{p.stock}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button color="primary" (click)="editProduct(p)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteProduct(p.id)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="filteredProducts.length === 0">
          <mat-icon>search_off</mat-icon>
          <p>Aucun produit ne correspond à votre recherche.</p>
        </div>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="filteredProducts.length"
          (pageChange)="onPageChange($event)"></app-pagination>
      </mat-card>
    </div>
  `,
  styles: [`
    .manager-container { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .table-card { border-radius: 15px; overflow: hidden; }
    .form-card { border-radius: 15px; padding: 20px; margin-bottom: 30px; }
    .thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin: 10px 0; }
    .full-width { width: 100%; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 15px; }
    .image-field { margin-bottom: 15px; }
    .image-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--luxe-text-muted); display: block; margin-bottom: 8px; font-weight: 600; }
    .image-actions { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
    .image-preview { width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 1px solid var(--luxe-border); }
    .table-toolbar { display: flex; align-items: center; gap: 16px; padding: 20px 20px 0; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 240px; }
    .cat-field { width: 220px; }
    .result-count { color: var(--luxe-text-muted); font-size: 0.85rem; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--luxe-text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 48px; height: 48px; margin-bottom: 12px; }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .import-help { color: var(--luxe-text-muted); font-size: 0.9rem; line-height: 1.7; }
    .import-help code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
    .import-rules { color: var(--luxe-text-muted); font-size: 0.85rem; line-height: 1.8; margin: 0 0 18px; padding-left: 20px; }
    .import-actions { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .stock-field { width: 200px; }
    .import-report { margin-top: 24px; padding: 16px; border-radius: 10px; border: 1px solid var(--luxe-border); }
    .report-summary { margin: 0 0 8px; }
    .report-errors { margin-top: 12px; color: var(--luxe-crimson); font-size: 0.85rem; }
    .report-errors ul { margin: 6px 0 0; padding-left: 20px; line-height: 1.7; }
  `]
})
export class ProductsManagerComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  displayedColumns = ['image', 'reference', 'name', 'contenance', 'price', 'stock', 'actions'];
  searchTerm = '';
  categoryFilter: string = 'all';
  pageIndex = 0;
  pageSize = 8;

  get filteredProducts(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.products.filter(p => {
      const catMatch = this.categoryFilter === 'all' || p.category === this.categoryFilter;
      if (!catMatch) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term)
        || (p.category || '').toLowerCase().includes(term)
        || (p.reference || '').toLowerCase().includes(term);
    });
  }

  get pagedProducts(): any[] {
    return this.filteredProducts.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }

  resetPage() { this.pageIndex = 0; }
  onPageChange(index: number) { this.pageIndex = index; }
  
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

  constructor(
    private crud: CrudService, 
    private api: ApiService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.initForm();
  }

  loadCategories() {
    this.crud.getAll<any>('categories').subscribe({
      next: data => this.categories = data,
      error: () => this.snackBar.open('Erreur lors du chargement des catégories', 'Fermer', { duration: 4000 })
    });
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
    this.crud.getAll<any>('products').subscribe(data => this.products = data);
  }

  toggleImport() {
    this.showImport = !this.showImport;
    if (!this.showImport) this.importReport = null;
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

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
      'NEL-001;Soins Visage;Crème de Nuit Régénérante;50 ml;89,900;https://exemple.com/creme.jpg;25',
      'NEL-002;Parfums;Eau de Parfum Oud;100 ml;149,000;parfum-oud.jpg;10'
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
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression du produit', 'Fermer', { duration: 3000 });
        }
      });
    }
  }
}
