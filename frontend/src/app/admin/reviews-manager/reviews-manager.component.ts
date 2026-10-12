import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-reviews-manager',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page fade-in">
      <header class="head">
        <h2 class="luxury-title">Avis & témoignages</h2>
        <p>Les avis produits et les témoignages boutique s’affichent dès qu’un client connecté les publie. L’étoile met un avis en avant sur l’accueil.</p>
      </header>

      <div class="panel">
        <div class="row head">
          <span>Client</span>
          <span>Cible</span>
          <span>Note</span>
          <span>Avis</span>
          <span></span>
        </div>
        <div class="row" *ngFor="let r of reviews">
          <div>
            <strong>{{ r.author_full || r.author }}</strong>
            <small>{{ r.createdAt | date:'d MMM y' }}</small>
          </div>
          <span>{{ r.product_name || 'Témoignage boutique' }}</span>
          <span class="stars">{{ stars(r.rating) }}</span>
          <p>{{ r.comment }}</p>
          <div class="actions">
            <button mat-icon-button (click)="toggleFeatured(r)" [attr.title]="r.featured ? 'Retirer de l’accueil' : 'Mettre en avant'">
              <mat-icon [class.on]="r.featured">{{ r.featured ? 'star' : 'star_border' }}</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="remove(r)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
        <div class="empty" *ngIf="!loading && !reviews.length">
          <mat-icon>rate_review</mat-icon>
          <p>Aucun avis pour le moment.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { width: 100%; min-width: 0; }
    .head { margin-bottom: 22px; }
    .head h2 { margin: 0 0 6px; font-family: var(--font-heading); font-size: 2rem; font-weight: 500; }
    .head p { margin: 0; color: var(--luxe-text-muted); font-weight: 300; }
    .panel { background: var(--luxe-white); border: 1px solid var(--luxe-border); border-radius: 16px; overflow: hidden; }
    .row { display: grid; grid-template-columns: 180px 170px 110px 1fr auto; gap: 16px; align-items: start; padding: 16px 20px; border-bottom: 1px solid var(--luxe-border); }
    .row.head { font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; color: var(--luxe-text-muted); font-weight: 600; }
    .row strong { display: block; }
    .row small { color: var(--luxe-text-muted); }
    .row p { margin: 0; line-height: 1.5; color: var(--luxe-charcoal); }
    .stars { color: var(--luxe-gold); letter-spacing: 1px; }
    .actions { display: flex; }
    .actions mat-icon.on { color: var(--luxe-gold); }
    .empty { text-align: center; padding: 56px 20px; color: var(--luxe-text-muted); }
    .empty mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--luxe-gold); margin-bottom: 10px; }
    @media (max-width: 800px) { .row, .row.head { grid-template-columns: 1fr; } }
  `]
})
export class ReviewsManagerComponent implements OnInit {
  reviews: any[] = [];
  loading = true;

  constructor(private api: ApiService, private snackBar: MatSnackBar, private confirm: ConfirmService) {}

  ngOnInit() {
    this.load();
  }

  stars(rating: number): string {
    const n = Math.max(0, Math.min(5, Number(rating) || 0));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  load() {
    this.loading = true;
    this.api.get<any[]>('reviews/manage').subscribe({
      next: (rows) => { this.reviews = rows || []; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les avis', 'Fermer', { duration: 4000 });
      }
    });
  }

  toggleFeatured(review: any) {
    this.api.put<any>('reviews', review.id, { featured: !review.featured }).subscribe({
      next: () => {
        this.snackBar.open(review.featured ? 'Retiré de l’accueil' : 'Mis en avant sur l’accueil', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => this.snackBar.open('Mise à jour impossible', 'Fermer', { duration: 3000 })
    });
  }

  async remove(review: any) {
    const ok = await this.confirm.ask({
      danger: true,
      title: 'Supprimer cet avis ?',
      message: 'Il disparaîtra du site. Cette action est définitive.',
      confirmLabel: 'Supprimer'
    });
    if (!ok) return;
    this.api.delete('reviews', review.id).subscribe({
      next: () => {
        this.snackBar.open('Avis supprimé', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => this.snackBar.open('Suppression impossible', 'Fermer', { duration: 3000 })
    });
  }
}
