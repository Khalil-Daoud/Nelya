import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../services/api.service';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';
import { ImageUrlPipe } from '../pipes/image-url.pipe';
import { BreadcrumbComponent } from '../components/breadcrumb/breadcrumb.component';

interface TrackedItem {
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string;
}

interface TrackedOrder {
  reference: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  total_amount: number;
  shipping_address: string;
  phone: string;
  guest_name: string;
  items: TrackedItem[];
}

const STEPS = [
  { key: 'pending', label: 'Enregistrée' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'delivered', label: 'Livrée' }
];

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    FormatCurrencyPipe,
    ImageUrlPipe,
    BreadcrumbComponent
  ],
  template: `
    <div class="track-page">
      <div class="container">
        <app-breadcrumb [crumbs]="[{label: 'Accueil', url: '/'}, {label: 'Suivi de commande'}]"></app-breadcrumb>

        <div class="state" *ngIf="loading">Chargement de votre commande…</div>

        <div class="state error" *ngIf="!loading && error">
          <mat-icon>search_off</mat-icon>
          <h1>Commande introuvable</h1>
          <p>Ce lien n’est plus valable, ou la commande n’existe pas. Vérifiez l’adresse reçue par email ou WhatsApp.</p>
          <a mat-flat-button color="primary" routerLink="/collection">Retour à la boutique</a>
        </div>

        <ng-container *ngIf="!loading && order">
          <header class="head">
            <span class="eyebrow">Suivi de commande</span>
            <h1>Commande #{{ order.reference }}</h1>
            <p>{{ order.createdAt | date:'dd MMMM yyyy à HH:mm' }}</p>
            <span class="status-badge" [ngClass]="'status-' + order.status">{{ order.statusLabel }}</span>
          </header>

          <ol class="timeline" *ngIf="order.status !== 'cancelled'; else cancelled">
            <li *ngFor="let step of steps" [class.done]="isDone(step.key)" [class.current]="order.status === step.key">
              <span class="dot"></span>
              <span class="label">{{ step.label }}</span>
            </li>
          </ol>
          <ng-template #cancelled>
            <p class="cancelled-note">Cette commande a été annulée. Le stock a été remis en rayon.</p>
          </ng-template>

          <section class="card">
            <h2>Articles</h2>
            <div class="item" *ngFor="let item of order.items">
              <img *ngIf="item.image_url" [src]="item.image_url | imageUrl" [alt]="item.name">
              <div class="item-body">
                <strong>{{ item.name }}</strong>
                <span>{{ item.quantity }} × {{ item.unit_price | formatCurrency }}</span>
              </div>
            </div>
            <div class="total">Total : <strong>{{ order.total_amount | formatCurrency }}</strong></div>
          </section>

          <section class="card">
            <h2>Livraison</h2>
            <p *ngIf="order.guest_name"><mat-icon>person_outline</mat-icon> {{ order.guest_name }}</p>
            <p *ngIf="order.phone"><mat-icon>phone_in_talk</mat-icon> {{ order.phone }}</p>
            <p *ngIf="order.shipping_address"><mat-icon>location_on</mat-icon> {{ order.shipping_address }}</p>
            <p class="pay"><mat-icon>local_shipping</mat-icon> Paiement en espèces à la livraison</p>
          </section>

          <p class="keep">Conservez ce lien : il se met à jour à chaque changement de statut.</p>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .track-page { min-height: 70vh; padding: 130px 0 80px; }
    .container { max-width: 720px; margin: 0 auto; padding: 0 24px; }
    .state { text-align: center; padding: 80px 20px; color: var(--luxe-text-muted); }
    .state.error h1 { font-family: var(--font-heading); color: var(--luxe-black); font-weight: 400; margin: 12px 0 8px; }
    .state.error mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--luxe-gold); }
    .head { text-align: center; margin: 28px 0 36px; }
    .eyebrow { letter-spacing: 0.18em; text-transform: uppercase; font-size: 0.72rem; color: var(--luxe-gold); }
    .head h1 { font-family: var(--font-heading); font-size: 2.1rem; font-weight: 400; margin: 10px 0 6px; color: var(--luxe-black); }
    .head p { color: var(--luxe-text-muted); font-weight: 300; margin: 0 0 16px; }
    .timeline {
      list-style: none; display: flex; justify-content: space-between; gap: 8px;
      padding: 0; margin: 0 0 36px;
    }
    .timeline li { flex: 1; text-align: center; position: relative; color: var(--luxe-text-muted); font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; }
    .timeline li:not(:last-child)::after {
      content: ''; position: absolute; top: 7px; left: 55%; right: -45%; height: 1px; background: var(--luxe-border);
    }
    .timeline li.done:not(:last-child)::after, .timeline li.current:not(:last-child)::after { background: var(--luxe-gold); }
    .dot {
      display: block; width: 14px; height: 14px; border-radius: 50%; margin: 0 auto 8px;
      border: 1px solid var(--luxe-border); background: var(--luxe-white);
    }
    .timeline li.done .dot, .timeline li.current .dot { background: var(--luxe-gold); border-color: var(--luxe-gold); }
    .cancelled-note { text-align: center; color: var(--luxe-danger); margin: 0 0 32px; }
    .card {
      background: var(--luxe-white); border: 1px solid var(--luxe-border);
      border-radius: var(--radius-lg); padding: 24px 26px; margin-bottom: 18px;
    }
    .card h2 { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 500; margin: 0 0 16px; }
    .item { display: flex; gap: 14px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--luxe-border); }
    .item:last-of-type { border-bottom: none; }
    .item img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; }
    .item-body { display: flex; flex-direction: column; gap: 4px; }
    .item-body span { color: var(--luxe-text-muted); font-size: 0.85rem; }
    .total { text-align: right; margin-top: 12px; color: var(--luxe-text-muted); }
    .total strong { font-family: var(--font-heading); font-size: 1.3rem; color: var(--luxe-black); }
    .card p { display: flex; align-items: flex-start; gap: 10px; margin: 8px 0; color: var(--luxe-charcoal); font-size: 0.92rem; }
    .card mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--luxe-gold); margin-top: 1px; }
    .pay { color: var(--luxe-text-muted) !important; }
    .keep { text-align: center; color: var(--luxe-text-muted); font-size: 0.85rem; font-weight: 300; margin-top: 8px; }
    @media (max-width: 600px) {
      .track-page { padding-top: 110px; }
      .timeline { flex-wrap: wrap; }
      .timeline li { flex: 1 1 40%; }
      .timeline li::after { display: none; }
    }
  `]
})
export class OrderTrackingComponent implements OnInit {
  loading = true;
  error = false;
  order: TrackedOrder | null = null;
  steps = STEPS;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    this.api.get<TrackedOrder>(`orders/track/${encodeURIComponent(token)}`).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  isDone(stepKey: string): boolean {
    if (!this.order) return false;
    const current = STEPS.findIndex((s) => s.key === this.order!.status);
    const step = STEPS.findIndex((s) => s.key === stepKey);
    return current >= 0 && step >= 0 && step < current;
  }
}
