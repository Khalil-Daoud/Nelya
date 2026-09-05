import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudService } from '../../services/crud.service';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-categories-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="manager-container fade-in">
      <div class="header">
        <div>
          <h2 class="luxury-title">Gestion des Catégories</h2>
          <p>Créez et organisez les catégories utilisées pour classer vos produits.</p>
        </div>
        <button mat-raised-button color="primary" (click)="toggleForm()" *ngIf="!showForm">
          <mat-icon>add</mat-icon> Ajouter une catégorie
        </button>
        <button mat-raised-button color="accent" (click)="toggleForm()" *ngIf="showForm">
          <mat-icon>close</mat-icon> Annuler
        </button>
      </div>

      <!-- Formulaire d'édition / création -->
      <mat-card class="form-card fade-in" *ngIf="showForm">
        <mat-card-header>
          <mat-card-title>{{ isEditMode ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nom de la catégorie</mat-label>
              <input matInput formControlName="name" placeholder="ex: Soins Visage">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (optionnel)</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Description de la catégorie..."></textarea>
            </mat-form-field>

            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="categoryForm.invalid">
                <mat-icon>save</mat-icon> Enregistrer
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Table des catégories -->
      <mat-card class="table-card" *ngIf="!showForm">
        <table mat-table [dataSource]="categories" class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Nom </th>
            <td mat-cell *matCellDef="let c"> {{c.name}} </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef> Description </th>
            <td mat-cell *matCellDef="let c"> {{c.description || '—'}} </td>
          </ng-container>

          <ng-container matColumnDef="count">
            <th mat-header-cell *matHeaderCellDef> Produits </th>
            <td mat-cell *matCellDef="let c"> {{ productCount(c.name) }} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button color="primary" (click)="editCategory(c)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteCategory(c)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="categories.length === 0">
          <mat-icon>category</mat-icon>
          <p>Aucune catégorie créée pour le moment.</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .manager-container { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; gap: 20px; }
    .header h2 { font-size: 2rem; margin-bottom: 8px; }
    .header p { color: #666; font-weight: 300; margin: 0; }
    .table-card { border-radius: 15px; overflow: hidden; }
    .form-card { border-radius: 15px; padding: 20px; margin-bottom: 30px; }
    .full-width { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 15px; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--luxe-text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 48px; height: 48px; margin-bottom: 12px; }
  `]
})
export class CategoriesManagerComponent implements OnInit {
  categories: any[] = [];
  products: any[] = [];
  displayedColumns = ['name', 'description', 'count', 'actions'];

  categoryForm!: FormGroup;
  showForm = false;
  isEditMode = false;
  editingCategoryId: string | null = null;

  constructor(
    private crud: CrudService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.initForm();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  loadCategories() {
    this.crud.getAll<any>('categories').subscribe({
      next: data => this.categories = data,
      error: () => this.snackBar.open('Erreur lors du chargement des catégories', 'Fermer', { duration: 4000 })
    });
  }

  loadProducts() {
    this.crud.getAll<any>('products').subscribe(data => this.products = data);
  }

  productCount(categoryName: string): number {
    return this.products.filter(p => p.category === categoryName).length;
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.isEditMode = false;
      this.editingCategoryId = null;
      this.categoryForm.reset();
    }
  }

  editCategory(category: any) {
    this.isEditMode = true;
    this.editingCategoryId = category.id;
    this.showForm = true;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description
    });
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;
    const payload = this.categoryForm.value;

    if (this.isEditMode && this.editingCategoryId) {
      this.crud.update('categories', this.editingCategoryId, payload).subscribe({
        next: () => {
          this.snackBar.open('Catégorie mise à jour avec succès', 'OK', { duration: 3000 });
          this.loadCategories();
          this.toggleForm();
        },
        error: (err) => {
          const msg = err?.error?.error?.includes('unique') ? 'Une catégorie avec ce nom existe déjà' : 'Erreur lors de la mise à jour de la catégorie';
          this.snackBar.open(msg, 'Fermer', { duration: 4000 });
        }
      });
    } else {
      this.crud.create('categories', payload).subscribe({
        next: () => {
          this.snackBar.open('Catégorie créée avec succès', 'OK', { duration: 3000 });
          this.loadCategories();
          this.toggleForm();
        },
        error: (err) => {
          const msg = err?.error?.error?.includes('unique') ? 'Une catégorie avec ce nom existe déjà' : 'Erreur lors de la création de la catégorie';
          this.snackBar.open(msg, 'Fermer', { duration: 4000 });
        }
      });
    }
  }

  deleteCategory(category: any) {
    const count = this.productCount(category.name);
    const warning = count > 0
      ? `Attention : ${count} produit(s) utilisent cette catégorie. Voulez-vous vraiment la supprimer ?`
      : 'Voulez-vous vraiment supprimer cette catégorie ?';
    if (confirm(warning)) {
      this.crud.delete('categories', category.id).subscribe({
        next: () => {
          this.snackBar.open('Catégorie supprimée', 'OK', { duration: 3000 });
          this.loadCategories();
        },
        error: () => this.snackBar.open('Erreur lors de la suppression de la catégorie', 'Fermer', { duration: 4000 })
      });
    }
  }
}
