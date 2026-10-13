import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/settings.service';
import { BrandService } from '../../services/brand.service';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Period {
  value: string;
  label: string;
  shortLabel: string;
}

interface DonutSlice {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  dash: number;
  offset: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#b54708' },
  confirmed: { label: 'Confirmée', color: '#175cd3' },
  shipped: { label: 'Expédiée', color: '#6941c6' },
  delivered: { label: 'Livrée', color: '#067647' },
  cancelled: { label: 'Annulée', color: '#b42318' }
};

const CATEGORY_COLORS = ['#c6a04a', '#2c2c2c', '#8b7355', '#175cd3', '#067647', '#6941c6', '#b54708'];

const PERIODS: Period[] = [
  { value: '7d', label: '7 derniers jours', shortLabel: '7 jours' },
  { value: '30d', label: '30 derniers jours', shortLabel: '30 jours' },
  { value: '3m', label: '3 derniers mois', shortLabel: '3 mois' },
  { value: '12m', label: '12 derniers mois', shortLabel: '12 mois' },
  { value: 'all', label: 'Depuis le début', shortLabel: 'Tout' }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink, FormatCurrencyPipe],
  template: `
    <div class="dashboard-container fade-in">
      <div class="header">
        <div class="header-text">
          <h1 class="luxury-title">Vue d'ensemble</h1>
          <p>Bienvenue dans votre centre de pilotage {{ brand.name }}.</p>
        </div>

        <div class="period-filter" role="group" aria-label="Filtrer par période">
          <button type="button" *ngFor="let p of periods" class="period-btn"
                  [class.active]="selectedPeriod === p.value" (click)="onPeriodChange(p.value)">
            {{ p.shortLabel }}
          </button>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card" *ngFor="let m of metrics">
          <div class="metric-icon">
            <mat-icon>{{m.icon}}</mat-icon>
          </div>
          <div class="metric-info">
            <span class="metric-title">{{m.title}}</span>
            <span class="metric-value">{{m.value}}</span>
            <span class="metric-trend">{{m.trend}}</span>
          </div>
        </div>
      </div>

      <div class="alerts" *ngIf="pendingCount || stock.outOfStock || stock.lowStock">
        <a class="alert pending" *ngIf="pendingCount" routerLink="/admin/orders">
          <mat-icon>hourglass_empty</mat-icon>
          {{ pendingCount }} commande{{ pendingCount > 1 ? 's' : '' }} en attente
        </a>
        <a class="alert stock" *ngIf="stock.outOfStock || stock.lowStock" routerLink="/admin/stock">
          <mat-icon>inventory_2</mat-icon>
          <span *ngIf="stock.outOfStock">{{ stock.outOfStock }} en rupture</span>
          <span *ngIf="stock.outOfStock && stock.lowStock"> · </span>
          <span *ngIf="stock.lowStock">{{ stock.lowStock }} stock faible</span>
        </a>
      </div>

      <div class="charts-row">
        <mat-card class="chart-card glass-panel">
          <mat-card-header>
            <mat-card-title>Chiffre d'Affaires — {{ periodLabel }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-empty" *ngIf="totalRevenue === 0">
              <mat-icon>show_chart</mat-icon>
              <p>Aucune vente sur cette période ({{ periodLabel.toLowerCase() }}).</p>
            </div>
            <svg *ngIf="totalRevenue > 0" viewBox="0 0 700 300" preserveAspectRatio="none" class="area-chart">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c6a04a" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#c6a04a" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <line *ngFor="let grid of gridLines" [attr.x1]="0" [attr.x2]="chartWidth"
                    [attr.y1]="grid.y" [attr.y2]="grid.y" class="grid-line"/>
              <polygon [attr.points]="areaPoints" fill="url(#areaGradient)" stroke="none" />
              <polyline [attr.points]="linePoints" fill="none" class="chart-line" />
              <g *ngFor="let p of points">
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" class="chart-dot" />
                <text [attr.x]="p.x" [attr.y]="p.y - 12" text-anchor="middle" class="chart-value">{{p.value | formatCurrency}}</text>
                <text [attr.x]="p.x" [attr.y]="290" text-anchor="middle" class="chart-label">{{p.label}}</text>
              </g>
            </svg>
          </mat-card-content>
        </mat-card>

        <mat-card class="orders-summary glass-panel">
          <mat-card-header>
            <mat-card-title>Commandes — {{ periodLabel }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="order-item" *ngFor="let order of recentOrders">
              <div class="order-avatar">{{order.userInitial}}</div>
              <div class="order-details">
                <span class="order-user">{{order.user}}</span>
                <span class="order-time">{{order.time}}</span>
              </div>
              <span class="order-amount">{{order.amount | formatCurrency}}</span>
            </div>
            <div class="order-item empty" *ngIf="recentOrders.length === 0">
              <span class="order-time">Aucune commande sur cette période.</span>
            </div>
            <button mat-button color="primary" class="view-all" routerLink="/admin/orders">VOIR TOUTES LES COMMANDES</button>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="insights-row">
        <mat-card class="glass-panel donut-card">
          <mat-card-header>
            <mat-card-title>Statuts</mat-card-title>
            <p class="card-sub">{{ statusTotal }} commande{{ statusTotal > 1 ? 's' : '' }} · {{ pendingCount }} à traiter</p>
          </mat-card-header>
          <mat-card-content>
            <div class="donut-head">
              <div class="donut-figure">
                <svg viewBox="0 0 160 160" class="donut">
                  <circle class="donut-track" cx="80" cy="80" r="56"></circle>
                  <circle *ngFor="let s of statusSlices"
                    cx="80" cy="80" r="56"
                    [attr.stroke]="s.color"
                    [attr.stroke-dasharray]="s.dash + ' ' + donutGap"
                    [attr.stroke-dashoffset]="s.offset"
                    transform="rotate(-90 80 80)"></circle>
                </svg>
                <div class="donut-center">
                  <strong>{{ statusTotal }}</strong>
                  <small>total</small>
                </div>
              </div>
            </div>
            <ul class="stat-rows">
              <li *ngFor="let s of statusRows">
                <div class="stat-line">
                  <i [style.background]="s.color"></i>
                  <span>{{ s.label }}</span>
                  <strong>{{ s.value }}</strong>
                  <small>{{ s.percent }}%</small>
                </div>
                <div class="bar"><b [style.width.%]="s.percent" [style.background]="s.color"></b></div>
              </li>
            </ul>
          </mat-card-content>
        </mat-card>

        <mat-card class="glass-panel donut-card">
          <mat-card-header>
            <mat-card-title>Catégories</mat-card-title>
            <p class="card-sub">CA des commandes actives</p>
          </mat-card-header>
          <mat-card-content>
            <div class="donut-empty" *ngIf="!categorySlices.length">Pas encore de ventes classées.</div>
            <ng-container *ngIf="categorySlices.length">
              <div class="donut-head">
                <div class="donut-figure">
                  <svg viewBox="0 0 160 160" class="donut">
                    <circle class="donut-track" cx="80" cy="80" r="56"></circle>
                    <circle *ngFor="let s of categorySlices"
                      cx="80" cy="80" r="56"
                      [attr.stroke]="s.color"
                      [attr.stroke-dasharray]="s.dash + ' ' + donutGap"
                      [attr.stroke-dashoffset]="s.offset"
                      transform="rotate(-90 80 80)"></circle>
                  </svg>
                  <div class="donut-center">
                    <strong class="money">{{ categoryTotal | formatCurrency }}</strong>
                    <small>CA</small>
                  </div>
                </div>
              </div>
              <ul class="stat-rows">
                <li *ngFor="let s of categorySlices">
                  <div class="stat-line">
                    <i [style.background]="s.color"></i>
                    <span>{{ s.label }}</span>
                    <strong>{{ s.value | formatCurrency }}</strong>
                    <small>{{ s.percent }}%</small>
                  </div>
                  <div class="bar"><b [style.width.%]="s.percent" [style.background]="s.color"></b></div>
                </li>
              </ul>
            </ng-container>
          </mat-card-content>
        </mat-card>

        <mat-card class="glass-panel top-card">
          <mat-card-header>
            <mat-card-title>Meilleurs articles</mat-card-title>
            <p class="card-sub">{{ topUnits }} unité{{ topUnits > 1 ? 's' : '' }} vendue{{ topUnits > 1 ? 's' : '' }} sur la période</p>
          </mat-card-header>
          <mat-card-content>
            <div class="donut-empty" *ngIf="!topProducts.length">Aucun article vendu sur cette période.</div>
            <ol class="top-list" *ngIf="topProducts.length">
              <li *ngFor="let p of topProducts; let i = index">
                <span class="rank">{{ i + 1 }}</span>
                <div class="top-meta">
                  <div class="top-head">
                    <strong>{{ p.name }}</strong>
                    <small>{{ shareOf(p.qty) }}%</small>
                  </div>
                  <span>{{ p.qty }} vendu{{ p.qty > 1 ? 's' : '' }} · {{ p.revenue | formatCurrency }}</span>
                  <div class="bar"><b [style.width.%]="topBar(p.qty)"></b></div>
                </div>
              </li>
            </ol>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 0; min-width: 0; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 50px; flex-wrap: wrap; }
    .header h1 { font-size: 2.8rem; margin-bottom: 10px; font-family: var(--font-heading); color: var(--luxe-black); }
    .header p { color: var(--luxe-text-muted); font-size: 1.05rem; font-weight: 300; margin: 0; }

    .period-filter { display: flex; gap: 8px; background: var(--luxe-offwhite); padding: 6px; border-radius: var(--radius-full); border: 1px solid var(--luxe-border); flex-wrap: wrap; }
    .period-btn {
      border: none; background: transparent; cursor: pointer; padding: 10px 20px;
      font-family: var(--font-body); font-size: 0.78rem; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: var(--luxe-text-muted); border-radius: var(--radius-full);
      transition: var(--transition-smooth); white-space: nowrap;
    }
    .period-btn:hover { color: var(--luxe-charcoal); }
    .period-btn.active { background: var(--luxe-black); color: var(--luxe-white); box-shadow: var(--shadow-card); }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 30px; margin-bottom: 50px; }
    .metric-card { background: var(--luxe-white); padding: 30px; border-radius: var(--radius-md); border: 1px solid var(--luxe-border); display: flex; gap: 20px; align-items: center; box-shadow: var(--shadow-subtle); transition: var(--transition-smooth); }
    .metric-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); }
    .metric-icon { width: 55px; height: 55px; border-radius: var(--radius-md); background: var(--luxe-offwhite); color: var(--luxe-charcoal); border: 1px solid var(--luxe-border); display: flex; align-items: center; justify-content: center; }
    .metric-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .metric-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: var(--luxe-text-muted); display: block; margin-bottom: 8px; font-weight: 500; }
    .metric-value { font-size: 1.8rem; font-weight: 400; color: var(--luxe-black); display: block; font-family: var(--font-heading); }
    .metric-trend { font-size: 0.75rem; margin-top: 8px; display: block; font-weight: 500; color: #2e7d32; }

    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
    .chart-card, .orders-summary { border-radius: var(--radius-md); padding: 30px; border: 1px solid var(--luxe-border); box-shadow: var(--shadow-subtle) !important; background: var(--luxe-white) !important; }
    mat-card-header { padding: 0 0 16px 0 !important; border-bottom: 1px solid var(--luxe-border); margin-bottom: 18px; display: block !important; }
    mat-card-title { font-family: var(--font-body) !important; font-size: 1.1rem !important; letter-spacing: 2px; text-transform: uppercase; font-weight: 600 !important; color: var(--luxe-charcoal); }

    .area-chart { width: 100%; height: 280px; }
    .grid-line { stroke: var(--luxe-border); stroke-width: 1; stroke-dasharray: 4 4; }
    .chart-line { stroke: var(--luxe-gold); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .chart-dot { fill: var(--luxe-gold); stroke: white; stroke-width: 2; }
    .chart-value { fill: var(--luxe-charcoal); font-size: 12px; font-weight: 600; }
    .chart-label { fill: var(--luxe-text-muted); font-size: 13px; font-weight: 500; }
    .chart-empty { text-align: center; padding: 90px 20px; color: var(--luxe-text-muted); }
    .chart-empty mat-icon { font-size: 3.5rem; width: 56px; height: 56px; margin-bottom: 12px; }

    .order-item { display: flex; align-items: center; gap: 20px; padding: 20px 0; border-bottom: 1px solid var(--luxe-border); }
    .order-item:last-child { border-bottom: none; }
    .order-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); display: flex; align-items: center; justify-content: center; font-weight: 500; color: var(--luxe-charcoal); font-size: 0.85rem; }
    .order-details { flex: 1; }
    .order-user { display: block; font-weight: 500; font-size: 0.95rem; color: var(--luxe-black); margin-bottom: 4px; }
    .order-time { font-size: 0.8rem; color: var(--luxe-text-muted); }
    .order-amount { font-weight: 600; color: var(--luxe-charcoal); font-size: 1.05rem; }

    .view-all { width: 100%; margin-top: 20px; letter-spacing: 2px; border: 1px solid var(--luxe-border) !important; color: var(--luxe-charcoal) !important; border-radius: var(--radius-sm) !important; padding: 10px !important; }
    .view-all:hover { background: var(--luxe-black) !important; color: var(--luxe-white) !important; }

    .alerts { display: flex; flex-wrap: wrap; gap: 12px; margin: -20px 0 36px; }
    .alert {
      display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
      padding: 10px 16px; border-radius: 999px; font-size: 0.82rem; font-weight: 600;
    }
    .alert mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .alert.pending { background: #fffaeb; color: #b54708; }
    .alert.stock { background: #fef3f2; color: #b42318; }

    .insights-row { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 30px; margin-top: 40px; align-items: stretch; }
    .donut-card, .top-card { border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--luxe-border); box-shadow: var(--shadow-subtle) !important; background: var(--luxe-white) !important; }
    .card-sub { margin: 6px 0 0; font-size: 0.78rem; font-weight: 400; color: var(--luxe-text-muted); letter-spacing: 0; text-transform: none; }
    .donut-head { display: flex; justify-content: center; margin-bottom: 18px; }
    .donut-figure { position: relative; width: 148px; height: 148px; }
    .donut { width: 148px; height: 148px; }
    .donut circle { fill: none; stroke-width: 18; stroke-linecap: butt; }
    .donut-track { stroke: #f1eee8; }
    .donut-center {
      position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none;
    }
    .donut-center strong { font-family: var(--font-heading); font-size: 1.7rem; line-height: 1; color: var(--luxe-black); }
    .donut-center strong.money { font-size: 0.95rem; }
    .donut-center small { font-size: 0.68rem; letter-spacing: 1px; text-transform: uppercase; color: var(--luxe-text-muted); margin-top: 4px; }
    .donut-empty { color: var(--luxe-text-muted); font-size: 0.88rem; padding: 28px 0; text-align: center; }

    .stat-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .stat-line { display: grid; grid-template-columns: 10px 1fr auto auto; gap: 8px; align-items: center; font-size: 0.82rem; }
    .stat-line i { width: 10px; height: 10px; border-radius: 50%; }
    .stat-line span, .stat-line strong { color: var(--luxe-charcoal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-line strong { font-weight: 600; }
    .stat-line small { color: var(--luxe-text-muted); min-width: 32px; text-align: right; }

    .top-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
    .top-list li { display: flex; gap: 12px; align-items: flex-start; }
    .rank {
      width: 26px; height: 26px; border-radius: 50%; background: var(--luxe-offwhite);
      border: 1px solid var(--luxe-border); display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: var(--luxe-charcoal); flex-shrink: 0; margin-top: 2px;
    }
    .top-meta { flex: 1; min-width: 0; }
    .top-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .top-head strong {
      font-size: 0.92rem; color: var(--luxe-black); font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
    }
    .top-head small { color: var(--luxe-text-muted); flex-shrink: 0; }
    .top-meta span { font-size: 0.75rem; color: var(--luxe-text-muted); }
    .bar { height: 6px; background: #f1eee8; border-radius: 99px; margin-top: 6px; overflow: hidden; }
    .bar b { display: block; height: 100%; background: var(--luxe-gold); border-radius: 99px; min-width: 0; }

    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .charts-row, .insights-row { grid-template-columns: 1fr; }
      .header { flex-direction: column; }
      .period-filter { width: 100%; overflow-x: auto; }
    }
    @media (max-width: 640px) {
      .metrics-grid { grid-template-columns: 1fr; gap: 12px; }
      .header h1 { font-size: 1.8rem; }
      .metric-card { padding: 18px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  periods = PERIODS;
  selectedPeriod = '7d';

  metrics: any[] = [];
  points: any[] = [];
  linePoints = '';
  areaPoints = '';
  gridLines: any[] = [];
  recentOrders: any[] = [];
  totalRevenue = 0;
  pendingCount = 0;
  statusTotal = 0;
  categoryTotal = 0;
  topUnits = 0;
  statusSlices: DonutSlice[] = [];
  statusRows: DonutSlice[] = [];
  categorySlices: DonutSlice[] = [];
  topProducts: TopProduct[] = [];
  stock = { outOfStock: 0, lowStock: 0, lowThreshold: 10 };
  readonly donutCirc = 2 * Math.PI * 56;
  readonly donutGap = this.donutCirc;
  private ordersData: any[] = [];
  private usersData: any[] = [];
  private topQtyMax = 1;

  readonly chartWidth = 700;
  readonly chartHeight = 300;

  constructor(
    private crud: CrudService,
    private api: ApiService,
    private settings: SettingsService,
    public brand: BrandService
  ) {}

  get periodLabel(): string {
    return this.periods.find(p => p.value === this.selectedPeriod)?.label || '';
  }

  ngOnInit() {
    this.settings.currency$.subscribe(() => {
      if (this.ordersData.length || this.usersData.length) {
        this.recalculateAll();
      }
    });
    this.loadDashboardData();
  }

  loadDashboardData() {
    forkJoin({
      orders: this.crud.getAll<any>('orders'),
      users: this.crud.getAll<any>('users'),
      stock: this.api.get<any>('products/stock-summary', { low: 10 }).pipe(
        catchError(() => of({ outOfStock: 0, lowStock: 0, lowThreshold: 10 }))
      )
    }).subscribe({
      next: ({ orders, users, stock }) => {
        this.ordersData = orders;
        this.usersData = users;
        this.stock = {
          outOfStock: Number(stock?.outOfStock) || 0,
          lowStock: Number(stock?.lowStock) || 0,
          lowThreshold: Number(stock?.lowThreshold) || 10
        };
        this.recalculateAll();
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
      }
    });
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    this.recalculateAll();
  }

  private recalculateAll() {
    const filtered = this.filterByPeriod(this.ordersData);
    this.calculateMetrics(filtered, this.usersData);
    this.calculateChart(filtered);
    this.calculateRecentOrders(filtered, this.usersData);
    this.calculateInsights(filtered);
  }

  /** Date de début de la période sélectionnée (null = pas de borne, "Depuis le début") */
  private getPeriodStart(): Date | null {
    const now = new Date();
    switch (this.selectedPeriod) {
      case '7d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      case '30d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case '12m': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default: return null;
    }
  }

  private filterByPeriod(orders: any[]): any[] {
    const start = this.getPeriodStart();
    if (!start) return orders;
    return orders.filter(o => new Date(o.createdAt || o.created_at) >= start);
  }

  private orderProfit(order: any): number {
    const items = order?.items || [];
    if (!items.length) return 0;
    return items.reduce((sum: number, item: any) => {
      const sale = Number(item.unit_price) || 0;
      const cost = Number(item.cost_price ?? item.Product?.cost_price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (sale - cost) * qty;
    }, 0);
  }

  calculateMetrics(orders: any[], users: any[]) {
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalProfit = activeOrders.reduce((sum, o) => sum + this.orderProfit(o), 0);
    const clients = users.filter(u => u.role === 'client');
    const newClientsCount = clients.length;
    const conversionRate = newClientsCount > 0
      ? ((orders.length / newClientsCount) * 100).toFixed(1) + '%'
      : '0%';
    const symbol = this.settings.currency.symbol;

    const avgBasket = activeOrders.length ? totalRevenue / activeOrders.length : 0;
    this.pendingCount = orders.filter(o => o.status === 'pending').length;

    this.metrics = [
      { title: 'Chiffre d\'Affaires', value: `${totalRevenue.toLocaleString('fr-FR')} ${symbol}`, icon: 'payments', trend: this.periodLabel },
      { title: 'Profit', value: `${totalProfit.toLocaleString('fr-FR')} ${symbol}`, icon: 'savings', trend: 'Vente − achat, commandes actives' },
      { title: 'Commandes', value: orders.length.toString(), icon: 'shopping_cart', trend: `${activeOrders.length} actives — ${this.periodLabel.toLowerCase()}` },
      { title: 'Panier moyen', value: `${avgBasket.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${symbol}`, icon: 'receipt_long', trend: `${newClientsCount} clients · ${conversionRate}` }
    ];
  }

  /** Construit les segments (buckets) du graphique selon la période choisie. */
  private buildBuckets(): { label: string; from: Date; to: Date; value: number }[] {
    const now = new Date();
    const daysShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthsShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const buckets: { label: string; from: Date; to: Date; value: number }[] = [];

    if (this.selectedPeriod === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        buckets.push({ label: i === 0 ? 'Auj.' : daysShort[d.getDay()], from, to, value: 0 });
      }
    } else if (this.selectedPeriod === '30d') {
      // 6 segments de 5 jours
      for (let i = 5; i >= 0; i--) {
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 5, 23, 59, 59, 999);
        const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 4);
        buckets.push({ label: `${from.getDate()}/${from.getMonth() + 1}`, from, to, value: 0 });
      }
    } else if (this.selectedPeriod === '3m') {
      // 12 segments hebdomadaires
      for (let i = 11; i >= 0; i--) {
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7, 23, 59, 59, 999);
        const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 6);
        buckets.push({ label: `${from.getDate()}/${from.getMonth() + 1}`, from, to, value: 0 });
      }
    } else if (this.selectedPeriod === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const from = new Date(d.getFullYear(), d.getMonth(), 1);
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        buckets.push({ label: monthsShort[d.getMonth()], from, to, value: 0 });
      }
    } else {
      // 'all' — un segment par mois depuis la commande la plus ancienne (24 mois max affichés)
      const earliest = this.ordersData.length
        ? this.ordersData.reduce((min: Date, o: any) => {
            const d = new Date(o.createdAt || o.created_at);
            return d < min ? d : min;
          }, new Date(now.getFullYear(), now.getMonth(), 1))
        : now;

      const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
      const monthCursors: Date[] = [];
      while (cursor <= now) {
        monthCursors.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      monthCursors.slice(-24).forEach(d => {
        const from = new Date(d.getFullYear(), d.getMonth(), 1);
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        buckets.push({ label: `${monthsShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, from, to, value: 0 });
      });
    }

    return buckets;
  }

  calculateChart(orders: any[]) {
    const buckets = this.buildBuckets();
    const activeOrders = orders.filter(o => o.status !== 'cancelled');

    activeOrders.forEach(o => {
      const date = new Date(o.createdAt || o.created_at);
      const bucket = buckets.find(b => date >= b.from && date <= b.to);
      if (bucket) bucket.value += parseFloat(o.total_amount || 0);
    });

    this.totalRevenue = Math.round(buckets.reduce((s, b) => s + b.value, 0));

    const padX = 30;
    const padTop = 40;
    const padBottom = 35;
    const innerH = this.chartHeight - padTop - padBottom;
    const step = buckets.length > 1 ? (this.chartWidth - padX * 2) / (buckets.length - 1) : 0;
    const maxValue = Math.max(...buckets.map(b => b.value), 1);

    this.points = buckets.map((b, i) => ({
      x: padX + i * step,
      y: padTop + innerH - (b.value / maxValue) * innerH,
      label: b.label,
      value: Math.round(b.value)
    }));

    this.linePoints = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.areaPoints = `${padX},${padTop + innerH} ${this.linePoints} ${this.chartWidth - padX},${padTop + innerH}`;

    this.gridLines = [0, 1, 2, 3].map(i => ({
      y: padTop + (innerH * i) / 3
    }));
  }

  calculateRecentOrders(orders: any[], users: any[]) {
    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at).getTime();
      const dateB = new Date(b.createdAt || b.created_at).getTime();
      return dateB - dateA;
    });

    this.recentOrders = sorted.slice(0, 6).map(o => {
      const userObj = users.find(u => u.id === o.user_id);
      const guest = String(o.guest_name || '').trim();
      const name = userObj
        ? `${userObj.first_name} ${userObj.last_name?.[0] || ''}.`
        : (guest || 'Invité');
      const userInitial = (userObj?.first_name || guest || 'I')[0].toUpperCase();

      const diffMs = new Date().getTime() - new Date(o.createdAt || o.created_at).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      let timeStr = 'il y a quelques instants';
      if (diffMins >= 60) {
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs >= 24) {
          const diffDays = Math.floor(diffHrs / 24);
          if (diffDays >= 30) {
            const diffMonths = Math.floor(diffDays / 30);
            timeStr = `il y a ${diffMonths} mois`;
          } else {
            timeStr = `il y a ${diffDays}j`;
          }
        } else {
          timeStr = `il y a ${diffHrs}h`;
        }
      } else if (diffMins > 0) {
        timeStr = `il y a ${diffMins} min`;
      }

      return {
        user: name,
        userInitial,
        time: timeStr,
        amount: parseFloat(o.total_amount || 0).toFixed(2)
      };
    });
  }

  topBar(qty: number): number {
    return this.topQtyMax ? Math.max(8, Math.round((qty / this.topQtyMax) * 100)) : 0;
  }

  shareOf(qty: number): number {
    return this.topUnits ? Math.round((qty / this.topUnits) * 100) : 0;
  }

  private calculateInsights(orders: any[]) {
    this.statusTotal = orders.length;
    const statusItems = Object.keys(STATUS_META).map((key) => ({
      key,
      label: STATUS_META[key].label,
      value: orders.filter((o) => o.status === key).length,
      color: STATUS_META[key].color
    }));
    this.statusSlices = this.buildDonut(statusItems);
    this.statusRows = this.withPercents(statusItems);

    const active = orders.filter((o) => o.status !== 'cancelled');
    const catMap = new Map<string, number>();
    const prodMap = new Map<string, TopProduct>();

    for (const order of active) {
      for (const item of order.items || []) {
        const qty = Number(item.quantity) || 0;
        const sale = Number(item.unit_price) || 0;
        const revenue = sale * qty;
        const category = String(item.Product?.category || 'Sans catégorie').trim() || 'Sans catégorie';
        catMap.set(category, (catMap.get(category) || 0) + revenue);

        const id = String(item.product_id || item.Product?.id || item.Product?.name || Math.random());
        const current = prodMap.get(id) || {
          name: item.Product?.name || 'Produit',
          qty: 0,
          revenue: 0
        };
        current.qty += qty;
        current.revenue += revenue;
        prodMap.set(id, current);
      }
    }

    const cats = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        key: label,
        label,
        value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }));
    this.categorySlices = this.buildDonut(cats);
    this.categoryTotal = cats.reduce((sum, item) => sum + item.value, 0);

    this.topProducts = [...prodMap.values()]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);
    this.topQtyMax = this.topProducts[0]?.qty || 1;
    this.topUnits = this.topProducts.reduce((sum, p) => sum + p.qty, 0);
  }

  private withPercents(items: Array<{ key: string; label: string; value: number; color: string }>): DonutSlice[] {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item) => ({
      ...item,
      percent: total ? Math.round((item.value / total) * 100) : 0,
      dash: 0,
      offset: 0
    }));
  }

  private buildDonut(items: Array<{ key: string; label: string; value: number; color: string }>): DonutSlice[] {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (!total) return [];
    let acc = 0;
    return items
      .filter((item) => item.value > 0)
      .map((item) => {
        const dash = (item.value / total) * this.donutCirc;
        const slice: DonutSlice = {
          ...item,
          percent: Math.round((item.value / total) * 100),
          dash,
          offset: -acc
        };
        acc += dash;
        return slice;
      });
  }
}
