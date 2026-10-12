import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée'
};

@Component({
  selector: 'app-client-fiche',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatSnackBarModule, FormatCurrencyPipe],
  template: `
    <div class="loading" *ngIf="loading">Chargement de la fiche…</div>
    <div class="fiche fade-in" *ngIf="fiche">
      <a class="back" routerLink="/admin/clients"><mat-icon>arrow_back</mat-icon> Tous les clients</a>

      <header class="hero">
        <div class="avatar">{{ initial }}</div>
        <div class="who">
          <h2>{{ fiche.user.first_name }} {{ fiche.user.last_name }}</h2>
          <p>{{ fiche.user.email }}</p>
          <span class="since">Client depuis {{ formatDate(fiche.user.createdAt) }}</span>
        </div>
      </header>

      <div class="stats">
        <article>
          <span>Commandes</span>
          <strong>{{ fiche.stats.orders }}</strong>
        </article>
        <article>
          <span>Total dépensé</span>
          <strong>{{ fiche.stats.spent | formatCurrency }}</strong>
        </article>
        <article>
          <span>Points fidélité</span>
          <strong>{{ fiche.stats.points }}</strong>
        </article>
      </div>

      <section class="card" *ngIf="fiche.contact.phone || fiche.contact.address">
        <h3>Coordonnées</h3>
        <p *ngIf="fiche.contact.phone"><mat-icon>phone</mat-icon> {{ fiche.contact.phone }}</p>
        <p *ngIf="fiche.contact.address"><mat-icon>location_on</mat-icon> {{ fiche.contact.address }}</p>
        <p class="hint">Dernière commande enregistrée</p>
      </section>

      <section class="card">
        <h3>Commandes</h3>
        <p class="empty" *ngIf="!fiche.orders.length">Aucune commande pour le moment.</p>
        <article class="order" *ngFor="let order of fiche.orders">
          <div class="order-top">
            <strong>#{{ order.id.slice(0, 8) }}</strong>
            <span class="status" [attr.data-s]="order.status">{{ statusLabel(order.status) }}</span>
            <span class="date">{{ formatDate(order.createdAt) }}</span>
            <span class="total">{{ order.total_amount | formatCurrency }}</span>
          </div>
          <ul class="items" *ngIf="order.items?.length">
            <li *ngFor="let item of order.items">
              {{ item.quantity }} × {{ item.Product?.name || item.product?.name || 'Article' }}
            </li>
          </ul>
        </article>
      </section>

      <section class="card">
        <h3>Avis</h3>
        <p class="empty" *ngIf="!fiche.reviews.length">Aucun avis publié.</p>
        <article class="review" *ngFor="let review of fiche.reviews">
          <div class="stars">
            <mat-icon *ngFor="let s of [1,2,3,4,5]">{{ s <= review.rating ? 'star' : 'star_border' }}</mat-icon>
          </div>
          <p>« {{ review.comment }} »</p>
          <small>{{ review.product_name || 'Témoignage boutique' }} · {{ formatDate(review.createdAt) }}</small>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .loading { color: var(--luxe-text-muted); padding: 24px 0; }
    .fiche { display: flex; flex-direction: column; gap: 18px; max-width: 920px; }
    .back {
      display: inline-flex; align-items: center; gap: 6px; color: var(--luxe-text-muted);
      text-decoration: none; font-size: 0.85rem; width: fit-content;
    }
    .back:hover { color: var(--luxe-gold); }
    .hero {
      display: flex; align-items: center; gap: 18px;
      background: #fff; border: 1px solid var(--luxe-border); border-radius: 18px; padding: 22px 24px;
    }
    .avatar {
      width: 64px; height: 64px; border-radius: 50%; background: var(--luxe-black); color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700;
    }
    .who h2 { margin: 0 0 4px; font-size: 1.5rem; }
    .who p { margin: 0; color: var(--luxe-text-muted); }
    .since { display: block; margin-top: 6px; font-size: 0.75rem; color: var(--luxe-text-muted); }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stats article {
      background: #fff; border: 1px solid var(--luxe-border); border-radius: 16px; padding: 16px 18px;
    }
    .stats span { display: block; font-size: 0.75rem; color: var(--luxe-text-muted); margin-bottom: 6px; }
    .stats strong { font-size: 1.25rem; }
    .card {
      background: #fff; border: 1px solid var(--luxe-border); border-radius: 18px; padding: 20px 22px;
    }
    .card h3 { margin: 0 0 14px; font-size: 1.05rem; }
    .card p { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    .card mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--luxe-gold); }
    .hint, .empty { color: var(--luxe-text-muted); font-size: 0.82rem; }
    .order { padding: 14px 0; border-top: 1px solid var(--luxe-border); }
    .order:first-of-type { border-top: none; padding-top: 0; }
    .order-top { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
    .status { font-size: 0.72rem; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 600; }
    .status[data-s='pending'] { color: #b26a00; }
    .status[data-s='delivered'] { color: #2e7d32; }
    .status[data-s='cancelled'] { color: #c62828; }
    .date { color: var(--luxe-text-muted); font-size: 0.8rem; }
    .total { margin-left: auto; font-weight: 600; }
    .items { margin: 10px 0 0; padding-left: 18px; color: var(--luxe-text-muted); font-size: 0.85rem; }
    .review { padding: 12px 0; border-top: 1px solid var(--luxe-border); }
    .review:first-of-type { border-top: none; }
    .stars mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .review small { color: var(--luxe-text-muted); }
    @media (max-width: 720px) { .stats { grid-template-columns: 1fr; } }
  `]
})
export class ClientFicheComponent implements OnInit {
  fiche: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  get initial(): string {
    return String(this.fiche?.user?.first_name || 'C')[0].toUpperCase();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/clients']);
      return;
    }
    this.api.get<any>(`users/${id}/fiche`).subscribe({
      next: (data) => { this.fiche = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger la fiche client', 'Fermer', { duration: 4000 });
        this.router.navigate(['/admin/clients']);
      }
    });
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  formatDate(value: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
