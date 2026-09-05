import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudService } from '../../services/crud.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';
import { PaginationComponent } from '../../components/pagination/pagination.component';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const STATUS_TRANSLATIONS: { [key: string]: string } = {
  'pending': 'En attente',
  'confirmed': 'Confirmée',
  'shipped': 'Expédiée',
  'delivered': 'Livrée',
  'cancelled': 'Annulée'
};

@Component({
  selector: 'app-orders-manager',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatSnackBarModule, FormsModule, FormatCurrencyPipe, PaginationComponent],
  template: `
    <div class="manager-container fade-in">
      <div class="header">
        <h2 class="luxury-title">Gestion des Commandes</h2>
        <p>Consultez les détails de chaque commande et mettez à jour son statut.</p>
      </div>

      <div class="toolbar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Rechercher (client, ID, téléphone)</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Ex: Sarah, #A1B2C3D4...">
        </mat-form-field>
        <mat-form-field appearance="outline" class="status-field">
          <mat-label>Statut</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="resetPage()">
            <mat-option value="all">Tous les statuts</mat-option>
            <mat-option *ngFor="let s of statuses" [value]="s">{{ translateStatus(s) }}</mat-option>
          </mat-select>
        </mat-form-field>
        <span class="result-count">{{ filteredOrders.length }} commande{{ filteredOrders.length > 1 ? 's' : '' }}</span>
      </div>

      <div class="table-wrapper glass-panel">
        <table mat-table [dataSource]="pagedOrders" class="luxe-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef> ID </th>
            <td mat-cell *matCellDef="let order"> #{{order.id.slice(0, 8)}} </td>
          </ng-container>

          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef> Client </th>
            <td mat-cell *matCellDef="let order">
              <div class="cell-user">
                <div class="cell-avatar">{{(order.User?.first_name || 'C')[0].toUpperCase()}}</div>
                <span>{{order.User ? (order.User.first_name + ' ' + order.User.last_name) : 'Client Inconnu'}}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Date </th>
            <td mat-cell *matCellDef="let order"> {{formatDate(order.createdAt)}} </td>
          </ng-container>

          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef> Total </th>
            <td mat-cell *matCellDef="let order"> <strong>{{order.total_amount | formatCurrency}}</strong> </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Statut </th>
            <td mat-cell *matCellDef="let order">
              <span class="status-badge" [ngClass]="(order.status || '').toLowerCase()">{{translateStatus(order.status)}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> </th>
            <td mat-cell *matCellDef="let order">
              <button mat-icon-button color="primary" (click)="toggleDetail(order.id)">
                <mat-icon>{{expandedId === order.id ? 'expand_less' : 'expand_more'}}</mat-icon>
              </button>
            </td>
          </ng-container>

          <ng-container matColumnDef="detail">
            <td mat-cell *matCellDef="let order" [attr.colspan]="displayedColumns.length">
              <div class="detail-panel" *ngIf="expandedId === order.id">
                <div class="detail-grid">
                  <div class="detail-block">
                    <h4>Client</h4>
                    <p><strong>{{order.User ? order.User.first_name + ' ' + order.User.last_name : '—'}}</strong></p>
                    <p>{{order.User?.email || '—'}}</p>
                  </div>
                  <div class="detail-block">
                    <h4>Livraison</h4>
                    <p><strong>Adresse :</strong> {{order.shipping_address || '—'}}</p>
                    <p><strong>Téléphone :</strong> {{getPhone(order)}}</p>
                    <p><strong>Paiement :</strong> {{getPayment(order)}}</p>
                  </div>
                  <div class="detail-block">
                    <h4>Statut</h4>
                    <mat-select class="status-select" [value]="order.status" (selectionChange)="updateStatus(order, $event.value)">
                      <mat-option *ngFor="let s of statuses" [value]="s">{{translateStatus(s)}}</mat-option>
                    </mat-select>
                  </div>
                </div>

                <h4 class="items-title">Articles</h4>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Qté</th>
                      <th>PU</th>
                      <th>Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of (order.items || [])">
                      <td>{{item.Product?.name || 'Produit inconnu'}}</td>
                      <td>{{item.quantity}}</td>
                      <td>{{item.unit_price | formatCurrency}}</td>
                      <td>{{(item.unit_price * item.quantity) | formatCurrency}}</td>
                    </tr>
                    <tr *ngIf="!order.items || order.items.length === 0">
                      <td colspan="4" class="empty-cell">Aucun article enregistré pour cette commande.</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" class="total-label">TOTAL</td>
                      <td class="total-value">{{order.total_amount | formatCurrency}}</td>
                    </tr>
                  </tfoot>
                </table>

                <div class="detail-notes" *ngIf="order.notes">
                  <h4>Remarques</h4>
                  <p>{{order.notes}}</p>
                </div>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          <tr mat-row *matRowDef="let row; columns: ['detail']; when: hasDetail" class="detail-row"></tr>
        </table>

        <div class="empty-state" *ngIf="filteredOrders.length === 0">
          <mat-icon>receipt_long</mat-icon>
          <p>Aucune commande ne correspond à votre recherche.</p>
        </div>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="filteredOrders.length"
          (pageChange)="onPageChange($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .manager-container { padding: 40px; }
    .header { margin-bottom: 30px; }
    .header h2 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { color: #666; font-weight: 300; }

    .toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 240px; }
    .status-field { width: 220px; }
    .result-count { color: var(--luxe-text-muted); font-size: 0.85rem; }

    .table-wrapper { border-radius: 12px; overflow: hidden; background: white; }
    .luxe-table { width: 100%; background: transparent; }

    th.mat-header-cell { color: #1a1a1a; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; padding: 20px; }
    td.mat-cell { padding: 16px 20px; color: #444; font-weight: 300; }

    .cell-user { display: flex; align-items: center; gap: 10px; }
    .cell-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--luxe-offwhite); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--luxe-charcoal); }

    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.pending { background: #fff8e1; color: #f57f17; }
    .status-badge.confirmed { background: #e3f2fd; color: #1976d2; }
    .status-badge.shipped { background: #e8f5e9; color: #2e7d32; }
    .status-badge.delivered { background: #f3e5f5; color: #7b1fa2; }
    .status-badge.cancelled { background: #ffebee; color: #c62828; }

    .detail-row td.mat-cell { padding: 0; border: none; }
    .detail-panel { background: var(--luxe-offwhite); padding: 30px; border-top: 1px solid var(--luxe-border); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .detail-block h4 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--luxe-text-muted); margin: 0 0 12px; font-weight: 600; }
    .detail-block p { margin: 4px 0; font-size: 0.9rem; color: var(--luxe-charcoal); }
    .detail-block p strong { color: var(--luxe-black); font-weight: 600; }
    .status-select { width: 100%; }

    .items-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--luxe-text-muted); margin: 0 0 12px; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
    .items-table th { text-align: left; padding: 12px 16px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--luxe-text-muted); border-bottom: 1px solid var(--luxe-border); }
    .items-table td { padding: 12px 16px; font-size: 0.9rem; color: var(--luxe-charcoal); border-bottom: 1px solid var(--luxe-border); }
    .items-table tfoot td { font-weight: 700; color: var(--luxe-black); border-bottom: none; }
    .items-table .total-label { text-align: right; }
    .items-table .total-value { font-size: 1rem; }
    .empty-cell { text-align: center; color: var(--luxe-text-muted); font-style: italic; }

    .detail-notes { margin-top: 20px; }
    .detail-notes h4 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--luxe-text-muted); margin: 0 0 8px; font-weight: 600; }
    .detail-notes p { margin: 0; font-size: 0.9rem; color: var(--luxe-charcoal); }

    .empty-state { text-align: center; padding: 80px 20px; color: var(--luxe-text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 48px; height: 48px; margin-bottom: 15px; }

    @media (max-width: 960px) {
      .manager-container { padding: 20px; }
      .detail-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class OrdersManagerComponent implements OnInit {
  orders: any[] = [];
  expandedId: string | null = null;
  displayedColumns: string[] = ['id', 'customer', 'date', 'total', 'status', 'actions'];
  statuses = ORDER_STATUSES;
  searchTerm = '';
  statusFilter: string = 'all';
  pageIndex = 0;
  pageSize = 8;

  constructor(private crud: CrudService, private snackBar: MatSnackBar) {}

  get filteredOrders(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.orders.filter(order => {
      const statusMatch = this.statusFilter === 'all' || order.status === this.statusFilter;
      if (!statusMatch) return false;
      if (!term) return true;
      const customer = order.User ? `${order.User.first_name} ${order.User.last_name} ${order.User.email}`.toLowerCase() : '';
      const id = String(order.id).toLowerCase();
      const phone = (order.phone || this.getPhone(order)).toLowerCase();
      return customer.includes(term) || id.includes(term) || phone.includes(term);
    });
  }

  get pagedOrders(): any[] {
    return this.filteredOrders.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }

  resetPage() {
    this.pageIndex = 0;
  }

  onPageChange(index: number) {
    this.pageIndex = index;
  }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.crud.getAll<any>('orders').subscribe({
      next: data => this.orders = data,
      error: () => this.snackBar.open('Erreur lors du chargement des commandes', 'Fermer', { duration: 4000 })
    });
  }

  hasDetail = (_index: number, order: any): boolean => {
    return this.expandedId === order.id;
  };

  toggleDetail(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  getPhone(order: any): string {
    if (order.phone) return order.phone;
    return order.notes?.match(/Téléphone: ([^|]+)/)?.[1]?.trim() || '—';
  }

  getPayment(order: any): string {
    return order.notes?.match(/Paiement: ([^|]+)/)?.[1]?.trim() || '—';
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  translateStatus(status: string): string {
    return STATUS_TRANSLATIONS[status] || status;
  }

  updateStatus(order: any, status: string) {
    if (order.status === status) return;
    this.crud.update('orders', order.id, { status }).subscribe({
      next: () => {
        order.status = status;
        this.snackBar.open(`Statut mis à jour : ${this.translateStatus(status)}`, 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', { duration: 4000 })
    });
  }
}
