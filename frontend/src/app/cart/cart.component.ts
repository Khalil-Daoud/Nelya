import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../services/cart.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CrudService } from '../services/crud.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImageUrlPipe } from '../pipes/image-url.pipe';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';
import { BreadcrumbComponent } from '../components/breadcrumb/breadcrumb.component';
import { SettingsService } from '../services/settings.service';

export interface CheckoutDialogData {
  guest: boolean;
}

export interface OrderSuccessDialogData {
  /** Lien wa.me pré-rempli, vide si la boutique n'a pas de numéro WhatsApp */
  whatsappLink: string;
  pointsAwarded?: number;
  trackingUrl?: string;
  emailed?: boolean;
}

@Component({
  selector: 'app-order-success-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="success-dialog">
      <div class="success-icon"><mat-icon>check_circle</mat-icon></div>
      <h2>Commande enregistrée</h2>
      <p class="lead">Merci ! Votre commande nous est bien parvenue.</p>
      <p class="points-won" *ngIf="data.pointsAwarded">
        Vous avez gagné <strong>{{ data.pointsAwarded }} point{{ data.pointsAwarded > 1 ? 's' : '' }}</strong> fidélité.
      </p>
      <p class="mail-note" *ngIf="data.trackingUrl">
        Un récapitulatif (numéro, détail et lien de suivi) part vers votre email.
        Conservez aussi le lien ci-dessous : le statut s’y met à jour.
      </p>

      <a *ngIf="data.trackingUrl" mat-stroked-button class="track-btn" [href]="data.trackingUrl">
        <mat-icon>local_shipping</mat-icon> Voir ma commande
      </a>

      <div *ngIf="data.whatsappLink" class="wa-invite">
        <p>
          Dernière étape : envoyez-nous le récapitulatif sur WhatsApp pour que nous
          puissions confirmer la livraison avec vous. Le message est déjà rédigé,
          il ne vous reste qu'à appuyer sur « Envoyer ».
        </p>
        <a mat-raised-button class="wa-btn" [href]="data.whatsappLink" target="_blank" rel="noopener"
           (click)="dialogRef.close(true)">
          <mat-icon>chat</mat-icon> Envoyer sur WhatsApp
        </a>
      </div>

      <button mat-button class="later-btn" mat-dialog-close>
        {{ data.whatsappLink ? 'Plus tard' : 'Fermer' }}
      </button>
    </div>
  `,
  styles: [`
    .success-dialog { padding: 36px 32px 24px; text-align: center; max-width: 440px; }
    .success-icon mat-icon { font-size: 56px; width: 56px; height: 56px; color: #25D366; }
    h2 { font-family: var(--font-heading); font-size: 1.9rem; color: var(--luxe-black); margin: 14px 0 8px; font-weight: 400; }
    .lead { color: var(--luxe-text-muted); font-weight: 300; margin: 0 0 16px; }
    .mail-note { color: var(--luxe-charcoal); font-size: 0.88rem; font-weight: 300; line-height: 1.6; margin: 0 0 18px; }
    .track-btn { width: 100%; margin-bottom: 16px; height: 48px; }
    .points-won { color: var(--luxe-charcoal); font-size: 0.95rem; margin: -10px 0 22px; }
    .points-won strong { color: var(--luxe-gold); }
    .wa-invite { background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); border-radius: var(--radius-md); padding: 22px 20px; margin-bottom: 14px; }
    .wa-invite p { font-size: 0.86rem; font-weight: 300; line-height: 1.65; color: var(--luxe-charcoal); margin: 0 0 20px; }
    .wa-btn { background: #25D366 !important; color: #fff !important; width: 100%; height: 50px; letter-spacing: 1px; font-weight: 500; }
    .later-btn { color: var(--luxe-text-muted); }
    @media (max-width: 600px) { .success-dialog { padding: 28px 20px 20px; } }
  `]
})
export class OrderSuccessDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OrderSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OrderSuccessDialogData
  ) {}
}

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title class="luxury-title" style="margin-bottom: 20px; text-align: center; font-size: 2rem;">Valider la commande</h2>
    <mat-dialog-content>
      <form [formGroup]="checkoutForm" class="checkout-form">
        <div *ngIf="data.guest" class="guest-block fade-in">
          <p class="guest-note">
            <mat-icon>person_outline</mat-icon>
            Vous commandez sans compte. L’email sert à vous envoyer le n° de commande et le lien de suivi.
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom et prénom</mat-label>
            <input matInput formControlName="guestName" placeholder="Ex: Flen Ben Foulen">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="guestEmail" placeholder="Ex: client@email.com">
            <mat-error *ngIf="checkoutForm.get('guestEmail')?.hasError('required')">Obligatoire pour le suivi</mat-error>
            <mat-error *ngIf="checkoutForm.get('guestEmail')?.hasError('email')">Email invalide</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Adresse de livraison complète</mat-label>
          <textarea matInput formControlName="address" rows="3" placeholder="Ex: 123 Avenue Habib Bourguiba, Tunis"></textarea>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Numéro de téléphone</mat-label>
          <input matInput formControlName="phone" placeholder="Ex: +216 20 000 000">
        </mat-form-field>

        <p class="pay-note">
          <mat-icon>local_shipping</mat-icon>
          Paiement en espèces à la livraison. Nous ne collectons pas de numéro de carte.
        </p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom: 20px; padding-right: 20px;">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" [disabled]="checkoutForm.invalid" (click)="submit()">Confirmer la commande</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .luxury-title { font-family: var(--font-heading); color: var(--luxe-black); }
    .checkout-form { padding-top: 10px; min-width: 450px; }
    .full-width { width: 100%; margin-bottom: 15px; }
    .pay-note { display: flex; align-items: flex-start; gap: 10px; margin: 4px 0 12px; font-size: 0.86rem; font-weight: 300; color: var(--luxe-charcoal); line-height: 1.5; }
    .pay-note mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--luxe-gold); flex-shrink: 0; }
    .guest-block { background: var(--luxe-offwhite); padding: 20px 20px 5px 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--luxe-border); }
    .guest-note { display: flex; align-items: center; gap: 10px; margin: 0 0 18px; font-size: 0.85rem; font-weight: 300; color: var(--luxe-text-muted); line-height: 1.5; }
    .guest-note mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--luxe-gold); flex-shrink: 0; }
    @media (max-width: 600px) { .checkout-form { min-width: 100%; } }
  `]
})
export class CheckoutDialogComponent {
  checkoutForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CheckoutDialogData
  ) {
    this.checkoutForm = this.fb.group({
      guestName: ['', data.guest ? [Validators.required] : []],
      guestEmail: ['', data.guest ? [Validators.required, Validators.email] : [Validators.email]],
      address: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  submit() {
    if (this.checkoutForm.valid) {
      this.dialogRef.close(this.checkoutForm.value);
    }
  }
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatListModule, MatIconModule, RouterLink, MatSnackBarModule, MatDialogModule, ImageUrlPipe, FormatCurrencyPipe, BreadcrumbComponent],
  template: `
    <div class="container fade-in">
      <div class="cart-crumbs">
        <app-breadcrumb [crumbs]="[{label: 'Mon Panier'}]"></app-breadcrumb>
      </div>
      <div class="cart-head">
        <h1 class="luxury-title">Votre Panier</h1>
        <a class="continue-link" routerLink="/collection"><mat-icon>arrow_back</mat-icon> Continuer mes achats</a>
      </div>
      
      <div class="cart-layout" *ngIf="items.length > 0; else emptyCart">
        <div class="items-list">
          <mat-card class="cart-card" *ngFor="let item of items">
            <div class="item-content">
              <img [src]="item.image_url | imageUrl" [alt]="item.name" class="item-img">
              <div class="item-details">
                <span class="category-label">{{item.category}}</span>
                <h3>{{item.name}}</h3>
                <p class="price">{{item.price | formatCurrency}}</p>
                <div class="quantity-control">
                  <button mat-icon-button (click)="decrease(item)"><mat-icon>remove</mat-icon></button>
                  <span>{{item.quantity}}</span>
                  <button mat-icon-button (click)="increase(item)"><mat-icon>add</mat-icon></button>
                </div>
              </div>
              <button mat-icon-button class="delete-btn" (click)="remove(item.id)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </mat-card>
        </div>

        <div class="summary">
          <mat-card class="summary-card">
            <h2>Résumé</h2>
            <div class="summary-row">
              <span>Sous-total</span>
              <span>{{total | formatCurrency}}</span>
            </div>
            <div class="summary-row">
              <span>Livraison</span>
              <span>Gratuite</span>
            </div>
            <hr>
            <div class="summary-row total">
              <span>Total</span>
              <span>{{total | formatCurrency}}</span>
            </div>
            <div class="loyalty-hint" *ngIf="currentUser?.role === 'client' && estimatedPoints > 0">
              <mat-icon>stars</mat-icon>
              Cette commande vous rapportera <strong>{{ estimatedPoints }} pts</strong>
            </div>
            <div class="loyalty-hint guest" *ngIf="!currentUser">
              <mat-icon>stars</mat-icon>
              Créez un compte pour gagner des points à chaque achat.
            </div>
            <button mat-raised-button color="primary" class="checkout-btn" (click)="checkout()">PASSER LA COMMANDE</button>
          </mat-card>
        </div>
      </div>

      <ng-template #emptyCart>
        <div class="empty-state">
          <mat-icon>shopping_bag</mat-icon>
          <h2>Votre panier est vide</h2>
          <p>Laissez-vous tenter par nos créations exclusives.</p>
          <button mat-raised-button color="primary" routerLink="/collection">DÉCOUVRIR LA BOUTIQUE</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .container { max-width: 1400px; margin: 160px auto 80px; padding: 0 40px; min-height: 60vh; }
    .cart-crumbs { margin-bottom: 26px; }
    .cart-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .continue-link { display: inline-flex; align-items: center; gap: 8px; color: var(--luxe-text-muted); text-decoration: none; font-size: 0.82rem; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; transition: color 0.3s ease; }
    .continue-link mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .continue-link:hover { color: var(--luxe-gold); }
    .cart-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 60px; margin-top: 50px; align-items: start; }
    
    .luxury-title { font-size: 3.5rem; margin-bottom: 20px; font-family: var(--font-heading); color: var(--luxe-black); }
    
    .cart-card { margin-bottom: 25px; padding: 25px; border-radius: var(--radius-sm) !important; box-shadow: var(--shadow-subtle) !important; border: 1px solid var(--luxe-border); background: var(--luxe-white); }
    .item-content { display: flex; align-items: stretch; gap: 30px; position: relative; }
    .item-img { width: 140px; height: 180px; object-fit: cover; border-radius: var(--radius-sm); }
    .item-details { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
    .category-label { font-size: 0.7rem; color: var(--luxe-text-muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: 500; }
    .item-details h3 { margin: 0 0 15px 0; font-family: var(--font-heading); font-size: 1.6rem; color: var(--luxe-black); font-weight: 400; }
    .price { color: var(--luxe-charcoal); font-weight: 500; margin: 0 0 20px 0; font-size: 1.2rem; }
    
    .quantity-control { display: flex; align-items: center; gap: 15px; border: 1px solid var(--luxe-border); padding: 5px; border-radius: 40px; width: fit-content; }
    .quantity-control span { font-weight: 500; min-width: 30px; text-align: center; color: var(--luxe-black); }

    .delete-btn { position: absolute; top: -10px; right: -10px; color: var(--luxe-text-muted); transition: var(--transition-smooth); }
    .delete-btn:hover { color: var(--luxe-black); }

    .summary-card { padding: 40px 30px; position: sticky; top: 120px; border-radius: var(--radius-md) !important; box-shadow: var(--shadow-subtle) !important; border: 1px solid var(--luxe-border); background: var(--luxe-offwhite); }
    .summary-card h2 { font-family: var(--font-heading); font-size: 1.8rem; margin-bottom: 30px; border-bottom: 1px solid var(--luxe-border); padding-bottom: 20px; color: var(--luxe-black); }
    .summary-row { display: flex; justify-content: space-between; margin: 25px 0; color: var(--luxe-charcoal); font-size: 1.05rem; }
    hr { border: none; border-top: 1px solid var(--luxe-border); margin: 30px 0; }
    .total { font-weight: 500; font-size: 1.6rem; color: var(--luxe-black); font-family: var(--font-heading); }
    .loyalty-hint {
      display: flex; align-items: flex-start; gap: 8px;
      margin-top: 8px; padding: 12px 14px; border-radius: var(--radius-sm);
      background: var(--luxe-white); border: 1px solid var(--luxe-border);
      color: var(--luxe-charcoal); font-size: 0.85rem; line-height: 1.45;
    }
    .loyalty-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--luxe-gold); }
    .loyalty-hint strong { color: var(--luxe-black); }
    .loyalty-hint.guest { color: var(--luxe-text-muted); }
    .checkout-btn { width: 100%; margin-top: 30px; height: 60px; letter-spacing: 3px !important; font-weight: 500; border-radius: var(--radius-sm) !important; }

    .empty-state { text-align: center; padding: 120px 20px; border-radius: var(--radius-md); border: 1px dashed var(--luxe-border); margin-top: 60px; }
    .empty-state mat-icon { font-size: 4rem; width: 64px; height: 64px; color: var(--luxe-border); margin-bottom: 25px; font-weight: 300; }
    .empty-state h2 { font-family: var(--font-heading); font-size: 2.2rem; margin-bottom: 15px; color: var(--luxe-charcoal); }
    .empty-state p { color: var(--luxe-text-muted); margin-bottom: 40px; font-weight: 300; font-size: 1.1rem; }
    
    @media (max-width: 960px) {
      .container { margin-top: 120px; padding: 0 20px; }
      .cart-layout { grid-template-columns: 1fr; }
      .item-content { flex-direction: column; }
      .item-img { width: 100%; height: 250px; }
      .delete-btn { top: 10px; right: 10px; background: rgba(255,255,255,0.8); }
    }
  `]
})
export class CartComponent implements OnInit {
  items: CartItem[] = [];
  total = 0;
  estimatedPoints = 0;
  currentUser: any = null;
  guestCheckoutEnabled = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private crudService: CrudService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private settings: SettingsService
  ) {}

  ngOnInit() {
    this.cartService.cartItems$.subscribe(items => {
      this.items = items;
      this.total = this.cartService.totalAmount;
      this.estimatedPoints = this.settings.pointsForItems(items);
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.settings.guestCheckout$.subscribe(enabled => {
      this.guestCheckoutEnabled = enabled;
    });
  }

  /**
   * Message WhatsApp pré-rempli que le client envoie lui-même à la boutique.
   * Rien à construire si le serveur confirme déjà la commande automatiquement.
   */
  private buildWhatsAppLink(order: any, form: any, isGuest: boolean): string {
    const wa = this.settings.whatsapp;
    if (!wa.number || wa.autoSend) return '';

    const symbol = this.settings.currency.symbol;
    const amount = (value: any) =>
      `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;

    const name = isGuest
      ? form.guestName
      : `${this.currentUser?.first_name || ''} ${this.currentUser?.last_name || ''}`.trim();

    const lines = [
      `Bonjour Nelya, je viens de passer la commande #${String(order?.id || '').slice(0, 8)}.`,
      '',
      `Nom : ${name}`,
      `Téléphone : ${form.phone}`,
      `Adresse : ${form.address}`,
      '',
      'Articles :',
      ...this.items.map(i => `- ${i.name} x${i.quantity} — ${amount(i.price * i.quantity)}`),
      '',
      `Total : ${amount(this.total)}`
    ];

    return `https://wa.me/${wa.number}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  increase(item: CartItem) {
    this.cartService.addToCart(item);
  }

  decrease(item: CartItem) {
    // [BUG-011 FIX] Déléguer au service qui notifie correctement le BehaviorSubject
    this.cartService.decreaseQuantity(item.id);
  }

  remove(id: string) {
    this.cartService.removeFromCart(id);
  }

  checkout() {
    const isGuest = !this.currentUser;

    if (isGuest && !this.guestCheckoutEnabled) {
      this.snackBar.open('Veuillez vous connecter pour valider votre commande.', 'Se Connecter', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/auth/login']);
      });
      return;
    }

    const dialogRef = this.dialog.open(CheckoutDialogComponent, {
      width: '600px',
      panelClass: 'luxury-dialog',
      data: { guest: isGuest }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // [SEC-FIX] Le montant est calculé côté serveur. On n'envoie que les items.
        const orderPayload: any = {
          items: this.items.map(i => ({ product_id: i.id, quantity: i.quantity })),
          shipping_address: result.address,
          phone: result.phone,
          notes: `Téléphone: ${result.phone} | Paiement: Espèces à la livraison`
        };

        if (isGuest) {
          orderPayload.guest_name = result.guestName;
          orderPayload.guest_email = result.guestEmail;
        }

        this.crudService.create('orders', orderPayload).subscribe({
          next: (order: any) => {
            const pointsAwarded = Number(order?.points_awarded) || 0;
            if (pointsAwarded > 0 && order?.User?.loyalty_points != null) {
              this.authService.patchCurrentUser({ loyalty_points: order.User.loyalty_points });
            } else if (pointsAwarded > 0) {
              this.authService.refreshMe();
            }
            const whatsappLink = this.buildWhatsAppLink(order, result, isGuest);
            const trackingUrl = order?.tracking_url || (order?.public_token ? `/commande/${order.public_token}` : '');
            this.cartService.clearCart();
            this.dialog
              .open(OrderSuccessDialogComponent, {
                panelClass: 'luxury-dialog',
                data: {
                  whatsappLink,
                  pointsAwarded,
                  trackingUrl,
                  emailed: isGuest && Boolean(result.guestEmail)
                }
              })
              .afterClosed()
              .subscribe(() => {
                if (isGuest && order?.public_token) {
                  this.router.navigate(['/commande', order.public_token]);
                } else {
                  this.router.navigate([isGuest ? '/collection' : '/profile']);
                }
              });
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Erreur lors de la validation de la commande.',
              'Fermer',
              { duration: 4000 }
            );
          }
        });
      }
    });
  }
}
