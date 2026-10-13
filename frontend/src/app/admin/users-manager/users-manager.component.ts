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
import { SettingsService, PermissionGroup } from '../../services/settings.service';
import { ConfirmService } from '../../services/confirm.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title style="font-family: var(--font-heading); text-align: center;">Réinitialiser le mot de passe</h2>
    <mat-dialog-content>
      <form [formGroup]="resetForm" class="reset-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nouveau mot de passe (min. 10 caractères)</mat-label>
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
      password: ['', [Validators.required, Validators.minLength(10)]],
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
        <h2 class="luxury-title">{{ isClients ? 'Clients' : 'Employés' }}</h2>
        <p *ngIf="isClients">Cliquez un client pour ouvrir sa fiche : commandes, avis et coordonnées.</p>
        <p *ngIf="!isClients">Comptes employés et administrateurs, avec leur groupe de permissions.</p>
      </div>

      <div class="toolbar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Rechercher (nom, email)</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Ex: Amina, admin@...">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{showForm ? 'close' : 'person_add'}}</mat-icon>
          {{showForm ? 'Annuler' : (isClients ? 'Ajouter un client' : 'Ajouter un employé')}}
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
            <mat-label>Mot de passe (min. 10)</mat-label>
            <input matInput type="password" [(ngModel)]="newUser.password">
            <mat-hint *ngIf="newUser.password && newUser.password.length < 10">
              Encore {{ 10 - newUser.password.length }} caractère(s)
            </mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" *ngIf="!isClients">
            <mat-label>Rôle</mat-label>
            <mat-select [(ngModel)]="newUser.role">
              <mat-option value="seller">Employé</mat-option>
              <mat-option value="admin">Administrateur</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" *ngIf="newUser.role === 'seller'">
            <mat-label>Groupe de permissions</mat-label>
            <mat-select [(ngModel)]="newUser.permission_group_id">
              <mat-option *ngFor="let g of staffGroups" [value]="g.id">{{ g.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary" [disabled]="!canCreate" (click)="createUser()">
          <mat-icon>save</mat-icon> Créer le compte
        </button>
        <p class="create-hint" *ngIf="!canCreate">Le bouton s’active quand tous les champs sont remplis, mot de passe de 10 caractères minimum.</p>
      </div>

      <div class="table-wrapper glass-panel">
        <table mat-table [dataSource]="pagedUsers" class="luxe-table">
          <ng-container matColumnDef="username">
            <th mat-header-cell *matHeaderCellDef> Utilisateur </th>
            <td mat-cell *matCellDef="let user" (click)="openFiche(user)">
              <div class="user-info" [class.clickable]="isClients">
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

          <ng-container matColumnDef="group">
            <th mat-header-cell *matHeaderCellDef> Groupe </th>
            <td mat-cell *matCellDef="let user">
              <mat-select
                *ngIf="user.role === 'seller'"
                class="role-select group-select"
                [value]="user.permission_group_id || 'seller'"
                (selectionChange)="updateGroup(user, $event.value)">
                <mat-option *ngFor="let g of staffGroups" [value]="g.id">{{ g.name }}</mat-option>
              </mat-select>
              <span *ngIf="user.role === 'admin'" class="user-email">Administrateur</span>
              <span *ngIf="user.role === 'client'" class="user-email">—</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="points">
            <th mat-header-cell *matHeaderCellDef> Points </th>
            <td mat-cell *matCellDef="let user">
              <span *ngIf="user.role === 'client'">{{ user.loyalty_points || 0 }}</span>
              <span *ngIf="user.role !== 'client'" class="user-email">—</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef> Créé le </th>
            <td mat-cell *matCellDef="let user"> {{formatDate(user.createdAt)}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let user">
              <button *ngIf="isClients" mat-icon-button color="primary" matTooltip="Voir la fiche" (click)="openFiche(user, $event)">
                <mat-icon>badge</mat-icon>
              </button>
              <button mat-icon-button color="primary" matTooltip="Réinitialiser le mot de passe" (click)="$event.stopPropagation(); resetPassword(user)">
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
          <p>Aucun {{ isClients ? 'client' : 'employé' }} ne correspond à votre recherche.</p>
        </div>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="filteredUsers.length"
          (pageChange)="onPageChange($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .manager-container { padding: 0; min-width: 0; }
    .header { margin-bottom: 30px; }
    .header h2 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { color: #666; font-weight: 300; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 20px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 220px; }

    .create-form { background: white; border: 1px solid var(--luxe-border); border-radius: 12px; padding: 25px; margin-bottom: 25px; }
    .create-form h3 { margin: 0 0 18px; font-size: 1.1rem; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .create-hint { margin: 10px 0 0; font-size: 0.8rem; color: var(--luxe-text-muted); font-weight: 300; }

    .table-wrapper { border-radius: 12px; overflow-x: auto; background: white; }
    .luxe-table { width: 100%; min-width: 640px; background: transparent; }
    th.mat-header-cell { color: #1a1a1a; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; padding: 20px; }
    td.mat-cell { padding: 14px 20px; color: #444; font-weight: 300; }

    .user-info { display: flex; align-items: center; gap: 12px; }
    .user-info.clickable { cursor: pointer; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--luxe-offwhite); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: var(--luxe-charcoal); }
    .user-info > div:last-child { display: flex; flex-direction: column; }
    .user-info span { font-weight: 500; color: var(--luxe-black); }
    .user-email { font-size: 0.75rem; font-weight: 300 !important; color: var(--luxe-text-muted); }
    .role-select { width: 130px; }
    .group-select { width: 160px; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--luxe-text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 48px; height: 48px; margin-bottom: 12px; }

    @media (max-width: 768px) {
      .header h2 { font-size: 1.8rem; }
      .search-field { width: 100%; min-width: 0; }
    }
  `]
})
export class UsersManagerComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  filter: 'client' | 'employee' = 'client';
  showForm = false;

  get isClients(): boolean { return this.filter === 'client'; }
  get displayedColumns(): string[] {
    return this.isClients
      ? ['username', 'points', 'created', 'actions']
      : ['username', 'role', 'group', 'created', 'actions'];
  }

  newUser: any = { first_name: '', last_name: '', email: '', password: '', role: 'client', permission_group_id: 'seller' };
  staffGroups: PermissionGroup[] = [];
  searchTerm = '';
  pageIndex = 0;
  pageSize = 8;

  get pagedUsers(): any[] {
    return this.filteredUsers.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }

  resetPage() { this.pageIndex = 0; }
  onPageChange(index: number) { this.pageIndex = index; }

  constructor(
    private crud: CrudService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private settings: SettingsService,
    private confirm: ConfirmService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.filter = this.route.snapshot.data['mode'] === 'employee' ? 'employee' : 'client';
    this.newUser.role = this.isClients ? 'client' : 'seller';
    this.loadUsers();
    this.settings.loadAccess().then((access) => {
      this.staffGroups = (access.groups || []).filter((g) => g.id !== 'admin');
    }).catch(() => {});
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

  openFiche(user: any, event?: Event) {
    if (!this.isClients) return;
    event?.stopPropagation();
    this.router.navigate(['/admin/clients', user.id]);
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
      !!this.newUser.email && !!this.newUser.password && this.newUser.password.length >= 10;
  }

  createUser() {
    if (!this.canCreate) return;
    this.crud.create('users', { ...this.newUser }).subscribe({
      next: () => {
        this.snackBar.open('Compte créé avec succès', 'OK', { duration: 3000 });
        this.showForm = false;
        this.newUser = { first_name: '', last_name: '', email: '', password: '', role: this.isClients ? 'client' : 'seller', permission_group_id: 'seller' };
        this.loadUsers();
      },
      error: () => this.snackBar.open('Erreur lors de la création du compte', 'Fermer', { duration: 4000 })
    });
  }

  updateRole(user: any, role: string) {
    if (user.role === role) return;
    const payload: any = { role };
    if (role === 'seller') payload.permission_group_id = user.permission_group_id || 'seller';
    this.crud.update('users', user.id, payload).subscribe({
      next: (updated: any) => {
        user.role = role;
        user.permission_group_id = updated?.permission_group_id ?? (role === 'seller' ? 'seller' : null);
        this.applyFilter();
        this.snackBar.open(`Rôle mis à jour : ${role}`, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour du rôle', 'Fermer', { duration: 4000 })
    });
  }

  updateGroup(user: any, groupId: string) {
    if ((user.permission_group_id || 'seller') === groupId) return;
    this.crud.update('users', user.id, { permission_group_id: groupId }).subscribe({
      next: () => {
        user.permission_group_id = groupId;
        this.snackBar.open('Groupe de permissions mis à jour', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour du groupe', 'Fermer', { duration: 4000 })
    });
  }

  async deleteUser(user: any) {
    const ok = await this.confirm.ask({
      danger: true,
      title: 'Supprimer ce compte ?',
      message: `Le compte de ${user.first_name} ${user.last_name} sera définitivement retiré.`,
      confirmLabel: 'Supprimer'
    });
    if (!ok) return;
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
