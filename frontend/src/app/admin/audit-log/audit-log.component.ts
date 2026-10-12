import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';

interface AuditEntry {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id?: string;
  summary: string;
  createdAt?: string;
  created_at?: string;
}

const ENTITIES = [
  { value: '', label: 'Toutes les actions' },
  { value: 'order', label: 'Commandes' },
  { value: 'product', label: 'Produits' },
  { value: 'stock', label: 'Stock' },
  { value: 'category', label: 'Catégories' },
  { value: 'user', label: 'Comptes' },
  { value: 'review', label: 'Avis' },
  { value: 'settings', label: 'Paramètres' }
];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, PaginationComponent
  ],
  template: `
    <div class="page fade-in">
      <header class="head">
        <h2 class="luxury-title">Historique</h2>
        <p>Chaque création, modification, suppression ou changement de statut est enregistré ici.</p>
      </header>

      <div class="panel">
        <div class="toolbar">
          <mat-form-field appearance="outline" class="search">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>Rechercher</mat-label>
            <input matInput [(ngModel)]="query" (ngModelChange)="onFilter()" placeholder="Personne, résumé…">
          </mat-form-field>
          <mat-form-field appearance="outline" class="entity">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="entity" (ngModelChange)="onFilter()">
              <mat-option *ngFor="let e of entities" [value]="e.value">{{ e.label }}</mat-option>
            </mat-select>
          </mat-form-field>
          <span class="count">{{ total }} action{{ total > 1 ? 's' : '' }}</span>
        </div>

        <div class="empty" *ngIf="!loading && !rows.length">
          <mat-icon>history</mat-icon>
          <p>Aucune action enregistrée pour ces filtres.</p>
        </div>

        <ul class="list" *ngIf="rows.length">
          <li *ngFor="let row of rows">
            <span class="dot" [attr.data-entity]="row.entity"></span>
            <div class="body">
              <strong>{{ row.actor_name }}</strong>
              <span>{{ row.summary }}</span>
            </div>
            <time>{{ formatDate(row.createdAt || row.created_at) }}</time>
          </li>
        </ul>

        <app-pagination [pageIndex]="pageIndex" [pageSize]="pageSize" [totalItems]="total"
          (pageChange)="onPage($event)"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .page { width: 100%; min-width: 0; }
    .head { margin-bottom: 22px; }
    .head h2 { margin: 0 0 6px; font-family: var(--font-heading); font-size: 2rem; font-weight: 500; }
    .head p { margin: 0; color: var(--luxe-text-muted); font-weight: 300; }

    .panel { background: var(--luxe-white); border: 1px solid var(--luxe-border); border-radius: 16px; overflow: hidden; }
    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 16px 18px 4px; }
    .search { flex: 1; min-width: 180px; }
    .entity { width: 200px; max-width: 100%; }
    .count { margin-left: auto; color: var(--luxe-text-muted); font-size: 0.85rem; }

    .list { list-style: none; margin: 0; padding: 0; }
    .list li {
      display: grid; grid-template-columns: 12px minmax(0, 1fr) auto;
      gap: 14px; align-items: start; padding: 14px 20px;
      border-top: 1px solid var(--luxe-border);
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; background: var(--luxe-gold); }
    .dot[data-entity="order"] { background: #175cd3; }
    .dot[data-entity="product"] { background: #c6a04a; }
    .dot[data-entity="stock"] { background: #b54708; }
    .dot[data-entity="category"] { background: #6941c6; }
    .dot[data-entity="user"] { background: #067647; }
    .dot[data-entity="settings"] { background: #1c1c1c; }
    .dot[data-entity="review"] { background: #c11574; }
    .body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .body strong { font-size: 0.92rem; color: var(--luxe-black); }
    .body span { font-size: 0.86rem; color: var(--luxe-charcoal); font-weight: 300; line-height: 1.45; }
    time { font-size: 0.75rem; color: var(--luxe-text-muted); white-space: nowrap; padding-top: 3px; }

    .empty { text-align: center; padding: 56px 20px; color: var(--luxe-text-muted); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--luxe-gold); margin-bottom: 10px; }

    @media (max-width: 720px) {
      .list li { grid-template-columns: 12px 1fr; }
      time { grid-column: 2; }
    }
  `]
})
export class AuditLogComponent implements OnInit {
  entities = ENTITIES;
  rows: AuditEntry[] = [];
  total = 0;
  loading = true;
  query = '';
  entity = '';
  pageIndex = 0;
  pageSize = 20;
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  onFilter() {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.pageIndex = 0;
      this.load();
    }, 250);
  }

  onPage(page: number) {
    this.pageIndex = page;
    this.load();
  }

  formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private load() {
    this.loading = true;
    this.api.get<{ data: AuditEntry[]; total: number }>('audit', {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      q: this.query.trim(),
      entity: this.entity
    }).subscribe({
      next: (res) => {
        this.rows = res.data || [];
        this.total = res.total || 0;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }
}
