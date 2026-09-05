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
        <button mat-raised-button color="primary" (click)="toggleForm()" *ngIf="!showForm">
          <mat-icon>add</mat-icon> Ajouter un produit
        </button>
        <button mat-raised-button color="accent" (click)="toggleForm()" *ngIf="showForm">
          <mat-icon>close</mat-icon> Annuler
        </button>
      </div>

      <!-- Formulaire d'édition / création -->
      <mat-card class="form-card fade-in" *ngIf="showForm">
        <mat-card-header>
          <mat-card-title>{{ isEditMode ? 'Modifier le produit' : 'Nouveau produit' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nom du produit</mat-label>
                <input matInput formControlName="name" placeholder="ex: Crème de Nuit">
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

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Nom </th>
            <td mat-cell *matCellDef="let p"> {{p.name}} </td>
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
  `]
})
export class ProductsManagerComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  displayedColumns = ['image', 'name', 'price', 'stock', 'actions'];
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
      return p.name.toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term);
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
