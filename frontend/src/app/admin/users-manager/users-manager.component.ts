import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudService } from '../../services/crud.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title style="font-family: var(--font-heading); text-align: center;">Réinitialiser le mot de passe</h2>
    <mat-dialog-content>
      <form [formGroup]="resetForm" class="reset-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nouveau mot de passe (min. 6 caractères)</mat-label>
          <input matInput type="password" formControlName="password">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmer le mot de passe</mat-label>
          <input matInput type="password" formControlName="confirm">
        </mat-form-field>
        <p class="error-msg" *ngIf="mismatch">Les mots de passe ne correspondent pas.</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding: 0 20px 20px;">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" [disabled]="resetForm.invalid || mismatch" (click)="submit()">
        Réinitialiser
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reset-form { min-width: 340px; padding-top: 10px; }
    .full-width { width: 100%; margin-bottom: 10px; }
    .error-msg { color: #c62828; font-size: 0.8rem; margin: 0 0 10px; }
  `]
})
export class ResetPasswordDialogComponent {
  resetForm: FormGroup;

  constructor(private fb: FormBuilder, public dialogRef: MatDialogRef<ResetPasswordDialogComponent>) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]]
    });
  }

  get mismatch(): boolean {
    return this.resetForm.get('password')?.value !== this.resetForm.get('confirm')?.value;
  }

  submit() {
    if (this.resetForm.invalid || this.mismatch) return;
    this.dialogRef.close(this.resetForm.get('password')?.value);
  }
}

@Component({
  selector: 'app-users-manager',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
    MatDialogModule, ReactiveFormsModule, FormsModule, PaginationComponent
  ],
  template: `
    <div class="manager-container fade-in">
      <div class="header">
        <h2 class="luxury-title">Clients & Employés</h2>
        <p>Gérez les comptes clients et ajoutez des comptes employés.</p>
      </div>

      <div class="toolbar">
        <div class="tabs">
          <button class="tab" [ngClass]="{'active': filter === 'all'}" (click)="setFilter('all')">Tous ({{allCount}})</button>
          <button class="tab" [ngClass]="{'active': filter === 'client'}" (click)="setFilter('client')">Clients ({{clientCount}})</button>
          <button class="tab" [ngClass]="{'active': filter === 'employee'}" (click)="setFilter('employee')">Employés ({{employeeCount}})</button>
        </div>
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Rechercher (nom, email)</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Ex: Amina, admin@...">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{showForm ? 'close' : 'person_add'}}</mat-icon>
          {{showForm ? 'Annuler' : 'Ajouter un compte'}}
        </button>
      </div>

      <div class="create-form" *ngIf="showForm">
        <h3>Nouveau compte</h3>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput [(ngModel)]="newUser.first_name">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput [(ngModel)]="newUser.last_name">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" [(ngModel)]="newUser.email">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mot de passe (min. 6)</mat-label>
            <input matInput type="password" [(ngModel)]="newUser.password">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Rôle</mat-label>
            <mat-select [(ngModel)]="newUser.role">
              <mat-option value="client">Client</mat-option>
              <mat-option value="seller">Employé</mat-option>
              <mat-option value="admin">Administrateur</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary" [disabled]="!canCreate" (click)="createUser()">
          <mat-icon>save</mat-icon> Créer le compte
        </button>
      </div>

      <div class="table-wrapper glass-panel">
        <table mat-table [dataSource]="pagedUsers" class="luxe-table">
          <ng-container matColumnDef="username">
            <th mat-header-cell *matHeaderCellDef> Utilisateur </th>
            <td mat-cell *matCellDef="let user">
              <div class="user-info">
                <div class="avatar">{{user.first_name ? user.first_name[0].toUpperCase() : 'U'}}</div>
                <div>
                  <span>{{user.first_name}} {{user.last_name}}</span>
                  <span class="user-email">{{user.email}}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef> Rôle </th>
            <td mat-cell *matCellDef="let user">
              <mat-select class="role-select" [value]="user.role" (selectionChange)="updateRole(user, $event.value)">
                <mat-option value="client">Client</mat-option>
                <mat-option value="seller">Employé</mat-option>
                <mat-option value="admin">Administrateur</mat-option>
              </mat-select>
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef> Créé le </th>
            <td mat-cell *matCellDef="let user"> {{formatDate(user.createdAt)}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let user">
              <button mat-icon-button color="primary" matTooltip="Réinitialiser le mot de passe" (click)="resetPassword(user)">
                <mat-icon>key</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Supprimer" (click)="deleteUser(user)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="filteredUsers.length === 0">
          <mat-icon>group_off</mat-icon>
          <p>Aucun utilisateur ne correspond à votre recherche.</p>
        </div>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="filteredUsers.length"
          (pageChange)="onPageChange($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .manager-container { padding: 40px; }
    .header { margin-bottom: 30px; }
    .header h2 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { color: #666; font-weight: 300; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 20px; flex-wrap: wrap; }
    .tabs { display: flex; gap: 8px; }
    .search-field { flex: 1; min-width: 220px; }
    .tab { padding: 9px 18px; border: 1px solid var(--luxe-border); background: white; border-radius: 30px; font-size: 0.8rem; font-weight: 500; color: var(--luxe-charcoal); cursor: pointer; transition: var(--transition-smooth); }
    .tab.active { background: var(--luxe-black); color: var(--luxe-white); border-color: var(--luxe-black); }

    .create-form { background: white; border: 1px solid var(--luxe-border); border-radius: 12px; padding: 25px; margin-bottom: 25px; }
    .create-form h3 { margin: 0 0 18px; font-size: 1.1rem; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }

    .table-wrapper { border-radius: 12px; overflow: hidden; background: white; }
    .luxe-table { width: 100%; background: transparent; }
    th.mat-header-cell { color: #1a1a1a; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; padding: 20px; }
    td.mat-cell { padding: 14px 20px; color: #444; font-weight: 300; }

    .user-info { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--luxe-offwhite); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: var(--luxe-charcoal); }
    .user-info > div:last-child { display: flex; flex-direction: column; }
    .user-info span { font-weight: 500; color: var(--luxe-black); }
    .user-email { font-size: 0.75rem; font-weight: 300 !important; color: var(--luxe-text-muted); }
    .role-select { width: 130px; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--luxe-text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 48px; height: 48px; margin-bottom: 12px; }

    @media (max-width: 768px) {
      .manager-container { padding: 20px; }
    }
  `]
})
export class UsersManagerComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  filter: 'all' | 'client' | 'employee' = 'all';
  showForm = false;
  displayedColumns: string[] = ['username', 'role', 'created', 'actions'];

  newUser: any = { first_name: '', last_name: '', email: '', password: '', role: 'client' };
  searchTerm = '';
  pageIndex = 0;
  pageSize = 8;

  get pagedUsers(): any[] {
    return this.filteredUsers.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }

  resetPage() { this.pageIndex = 0; }
  onPageChange(index: number) { this.pageIndex = index; }

  constructor(private crud: CrudService, private snackBar: MatSnackBar, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadUsers();
  }

  resetPassword(user: any) {
    const dialogRef = this.dialog.open(ResetPasswordDialogComponent, {
      width: '420px',
      panelClass: 'luxury-dialog'
    });
    dialogRef.afterClosed().subscribe(password => {
      if (!password) return;
      this.crud.update('users', user.id, { password }).subscribe({
        next: () => this.snackBar.open(`Mot de passe réinitialisé pour ${user.first_name} ${user.last_name}`, 'OK', { duration: 3000 }),
        error: () => this.snackBar.open('Erreur lors de la réinitialisation du mot de passe', 'Fermer', { duration: 4000 })
      });
    });
  }

  loadUsers() {
    this.crud.getAll<any>('users').subscribe({
      next: data => {
        this.users = data;
        this.applyFilter();
      },
      error: () => this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', { duration: 4000 })
    });
  }

  get allCount() { return this.users.length; }
  get clientCount() { return this.users.filter(u => u.role === 'client').length; }
  get employeeCount() { return this.users.filter(u => u.role === 'seller' || u.role === 'admin').length; }

  setFilter(filter: 'all' | 'client' | 'employee') {
    this.filter = filter;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    const byRole = (u: any) => {
      if (this.filter === 'client') return u.role === 'client';
      if (this.filter === 'employee') return u.role === 'seller' || u.role === 'admin';
      return true;
    };
    this.filteredUsers = this.users.filter(u => {
      if (!byRole(u)) return false;
      if (!term) return true;
      const name = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase();
      return name.includes(term);
    });
    this.pageIndex = 0;
  }

  get canCreate(): boolean {
    return !!this.newUser.first_name && !!this.newUser.last_name &&
      !!this.newUser.email && !!this.newUser.password && this.newUser.password.length >= 6;
  }

  createUser() {
    if (!this.canCreate) return;
    this.crud.create('users', { ...this.newUser }).subscribe({
      next: () => {
        this.snackBar.open('Compte créé avec succès', 'OK', { duration: 3000 });
        this.showForm = false;
        this.newUser = { first_name: '', last_name: '', email: '', password: '', role: 'client' };
        this.loadUsers();
      },
      error: () => this.snackBar.open('Erreur lors de la création du compte', 'Fermer', { duration: 4000 })
    });
  }

  updateRole(user: any, role: string) {
    if (user.role === role) return;
    this.crud.update('users', user.id, { role }).subscribe({
      next: () => {
        user.role = role;
        this.applyFilter();
        this.snackBar.open(`Rôle mis à jour : ${role}`, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour du rôle', 'Fermer', { duration: 4000 })
    });
  }

  deleteUser(user: any) {
    if (!confirm(`Supprimer le compte de ${user.first_name} ${user.last_name} ?`)) return;
    this.crud.delete('users', user.id).subscribe({
      next: () => {
        this.snackBar.open('Compte supprimé', 'OK', { duration: 3000 });
        this.loadUsers();
      },
      error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 4000 })
    });
  }

  formatDate(value: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
