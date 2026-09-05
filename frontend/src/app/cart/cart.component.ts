import { Component, OnInit } from '@angular/core';
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
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImageUrlPipe } from '../pipes/image-url.pipe';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';
import { BreadcrumbComponent } from '../components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title class="luxury-title" style="margin-bottom: 20px; text-align: center; font-size: 2rem;">Valider la commande</h2>
    <mat-dialog-content>
      <form [formGroup]="checkoutForm" class="checkout-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Adresse de livraison complète</mat-label>
          <textarea matInput formControlName="address" rows="3" placeholder="Ex: 123 Avenue Habib Bourguiba, Tunis"></textarea>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Numéro de téléphone</mat-label>
          <input matInput formControlName="phone" placeholder="Ex: +216 20 000 000">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Méthode de paiement</mat-label>
          <mat-select formControlName="paymentMethod">
            <mat-option value="cash">
              <mat-icon>local_shipping</mat-icon> Espèces à la livraison
            </mat-option>
            <mat-option value="card">
              <mat-icon>credit_card</mat-icon> Carte Bancaire
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="checkoutForm.get('paymentMethod')?.value === 'card'" class="card-info fade-in">
          <div class="card-row">
            <mat-form-field appearance="outline" style="flex: 2;">
              <mat-label>Numéro de carte</mat-label>
              <input matInput formControlName="cardNumber" placeholder="0000 0000 0000 0000">
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Expiration</mat-label>
              <input matInput formControlName="cardExpiry" placeholder="MM/YY">
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>CVC</mat-label>
              <input matInput type="password" formControlName="cardCvc" placeholder="123">
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom: 20px; padding-right: 20px;">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" [disabled]="checkoutForm.invalid" (click)="submit()">Confirmer et Payer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .luxury-title { font-family: var(--font-heading); color: var(--luxe-black); }
    .checkout-form { padding-top: 10px; min-width: 450px; }
    .full-width { width: 100%; margin-bottom: 15px; }
    .card-info { background: var(--luxe-offwhite); padding: 25px 20px 10px 20px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--luxe-border); }
    .card-row { display: flex; gap: 15px; }
    @media (max-width: 600px) { .checkout-form { min-width: 100%; } .card-row { flex-direction: column; gap: 0; } }
  `]
})
export class CheckoutDialogComponent {
  checkoutForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CheckoutDialogComponent>
  ) {
    this.checkoutForm = this.fb.group({
      address: ['', Validators.required],
      phone: ['', Validators.required],
      paymentMethod: ['cash', Validators.required],
      cardNumber: [''],
      cardExpiry: [''],
      cardCvc: ['']
    });

    this.checkoutForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      const cardControls = ['cardNumber', 'cardExpiry', 'cardCvc'];
      if (method === 'card') {
        cardControls.forEach(c => this.checkoutForm.get(c)?.setValidators([Validators.required]));
      } else {
        cardControls.forEach(c => {
          this.checkoutForm.get(c)?.clearValidators();
          this.checkoutForm.get(c)?.setValue('');
        });
      }
      cardControls.forEach(c => this.checkoutForm.get(c)?.updateValueAndValidity());
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
  currentUser: any = null;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private crudService: CrudService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.cartService.cartItems$.subscribe(items => {
      this.items = items;
      this.total = this.cartService.totalAmount;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
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
    if (!this.currentUser) {
      this.snackBar.open('Veuillez vous connecter pour valider votre commande.', 'Se Connecter', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/auth/login']);
      });
      return;
    }

    const dialogRef = this.dialog.open(CheckoutDialogComponent, {
      width: '600px',
      panelClass: 'luxury-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // [SEC-FIX] Le montant est calculé côté serveur. On n'envoie que les items.
        const orderPayload = {
          items: this.items.map(i => ({ product_id: i.id, quantity: i.quantity })),
          shipping_address: result.address,
          phone: result.phone,
          notes: `Téléphone: ${result.phone} | Paiement: ${result.paymentMethod === 'card' ? 'Carte Bancaire' : 'Espèces'}`
        };

        this.crudService.create('orders', orderPayload).subscribe({
          next: () => {
            this.cartService.clearCart();
            this.snackBar.open('Votre commande a été validée avec succès !', 'Fermer', {
              duration: 5000
            });
            this.router.navigate(['/profile']);
          },
          error: () => {
            this.snackBar.open('Erreur lors de la validation de la commande.', 'Fermer', { duration: 4000 });
          }
        });
      }
    });
  }
}
