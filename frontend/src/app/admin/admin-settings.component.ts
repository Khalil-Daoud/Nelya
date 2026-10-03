import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService, Currency, WhatsAppSettings } from '../services/settings.service';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatRadioModule,
    MatCheckboxModule, MatFormFieldModule, MatInputModule, FormsModule,
    MatSnackBarModule, FormatCurrencyPipe
  ],
  template: `
    <div class="settings-container fade-in">
      <div class="header">
        <h2 class="luxury-title">Paramètres de la boutique</h2>
        <p>Devise, règles de commande et notifications WhatsApp.</p>
      </div>

      <div class="settings-grid">

        <mat-card class="settings-card glass-panel">
          <div class="card-top">
            <div class="card-icon"><mat-icon>payments</mat-icon></div>
            <div class="card-heading">
              <h3>Devise</h3>
              <p>Les prix gardent leur valeur, seul le symbole affiché change.</p>
            </div>
          </div>

          <mat-radio-group [(ngModel)]="selected" class="currency-list">
            <mat-radio-button *ngFor="let c of currencies" [value]="c.code" class="currency-option">
              <span class="currency-symbol">{{c.symbol}}</span>
              <span class="currency-name">{{c.label}}</span>
              <span class="currency-code">{{c.code}}</span>
            </mat-radio-button>
          </mat-radio-group>

          <div class="preview">
            <span class="preview-label">Aperçu d'un prix</span>
            <span class="preview-value">{{ 25 | formatCurrency }}</span>
          </div>

          <div class="card-actions">
            <button mat-raised-button color="primary" [disabled]="selected === current?.code || saving" (click)="save()">
              <mat-icon>save</mat-icon> Enregistrer
            </button>
          </div>
        </mat-card>

        <mat-card class="settings-card glass-panel">
          <div class="card-top">
            <div class="card-icon"><mat-icon>how_to_reg</mat-icon></div>
            <div class="card-heading">
              <h3>Commande sans compte</h3>
              <p>Autoriser ou non un client à commander sans créer de compte.</p>
            </div>
          </div>

          <mat-checkbox [(ngModel)]="guestCheckout" (change)="saveGuestCheckout()" [disabled]="savingGuest" class="option-check">
            Autoriser les clients à commander sans compte
          </mat-checkbox>

          <p class="hint" *ngIf="guestCheckout">
            Le client renseigne son nom, son téléphone et son adresse au moment de valider.
            La commande apparaît dans « Commandes » avec la mention « invité ».
          </p>
          <p class="hint" *ngIf="!guestCheckout">
            Le client doit se connecter ou créer un compte avant de valider son panier.
          </p>
        </mat-card>

        <mat-card class="settings-card glass-panel wide">
          <div class="card-top">
            <div class="card-icon whatsapp"><mat-icon>chat</mat-icon></div>
            <div class="card-heading">
              <h3>Notifications WhatsApp</h3>
              <p>Recevez chaque commande sur WhatsApp et confirmez-la au client.</p>
            </div>
          </div>

          <div class="whatsapp-grid">

            <div class="wa-block">
              <h4><mat-icon>storefront</mat-icon> Numéro de la boutique</h4>
              <p class="hint">
                Ce numéro reçoit le récapitulatif de chaque commande. Il sert aussi de destinataire
                quand le client envoie lui-même sa confirmation.
              </p>
              <div class="number-row">
                <mat-form-field appearance="outline" class="number-field">
                  <mat-label>Numéro WhatsApp</mat-label>
                  <input matInput [(ngModel)]="whatsappNumber" placeholder="+216 22 580 632">
                  <mat-hint>Avec l'indicatif pays</mat-hint>
                </mat-form-field>
                <button mat-raised-button color="primary" [disabled]="savingNumber || !numberChanged" (click)="saveNumber()">
                  <mat-icon>save</mat-icon> Enregistrer
                </button>
              </div>
            </div>

            <div class="wa-block">
              <h4><mat-icon>mark_chat_read</mat-icon> Confirmation au client</h4>

              <div class="status" [class.ready]="whatsapp.providerReady">
                <mat-icon>{{ whatsapp.providerReady ? 'check_circle' : 'info' }}</mat-icon>
                <span *ngIf="whatsapp.providerReady">
                  Envoi automatique disponible : le client reçoit sa confirmation sans rien faire.
                </span>
                <span *ngIf="!whatsapp.providerReady">
                  Envoi automatique indisponible. Après avoir validé, le client est invité à vous
                  envoyer lui-même le récapitulatif en appuyant sur « Envoyer » dans WhatsApp.
                </span>
              </div>

              <mat-checkbox
                [(ngModel)]="notifyCustomer"
                (change)="saveNotifyCustomer()"
                [disabled]="savingNotify || !whatsapp.providerReady"
                class="option-check">
                Envoyer automatiquement la confirmation au client
              </mat-checkbox>

              <p class="hint" *ngIf="!whatsapp.providerReady">
                Pour activer cette option, WhatsApp exige un compte professionnel officiel.
                Renseignez <code>WHATSAPP_CLOUD_TOKEN</code> et <code>WHATSAPP_CLOUD_PHONE_ID</code>
                (Meta Cloud API), ou les identifiants Twilio, dans les variables du serveur.
              </p>
            </div>

          </div>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .settings-container { padding: 40px; max-width: 1180px; }
    .header { margin-bottom: 32px; }
    .header h2 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { color: #666; font-weight: 300; }

    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 26px; align-items: start; }
    .settings-card { padding: 28px; border-radius: 14px; }
    .settings-card.wide { grid-column: 1 / -1; }

    .card-top { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
    .card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); flex-shrink: 0; }
    .card-icon mat-icon { color: var(--luxe-gold); }
    .card-icon.whatsapp mat-icon { color: #25D366; }
    .card-heading h3 { margin: 0 0 6px; font-size: 1.15rem; font-weight: 600; color: var(--luxe-black); }
    .card-heading p { margin: 0; font-size: 0.85rem; font-weight: 300; color: var(--luxe-text-muted); line-height: 1.5; }

    .currency-list { display: flex; flex-direction: column; gap: 6px; }
    .currency-option { display: flex; align-items: center; padding: 14px; border: 1px solid var(--luxe-border); border-radius: 10px; margin: 4px 0; transition: var(--transition-smooth); }
    .currency-symbol { font-size: 1.3rem; font-weight: 700; color: var(--luxe-black); margin-right: 15px; min-width: 28px; }
    .currency-name { flex: 1; font-size: 0.95rem; color: var(--luxe-charcoal); }
    .currency-code { font-size: 0.75rem; color: var(--luxe-text-muted); letter-spacing: 1px; }

    .preview { margin-top: 22px; padding: 16px 20px; background: var(--luxe-offwhite); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 15px; }
    .preview-label { font-size: 0.8rem; color: var(--luxe-text-muted); }
    .preview-value { font-size: 1.3rem; font-weight: 700; color: var(--luxe-black); font-family: var(--font-heading); }

    .card-actions { display: flex; justify-content: flex-end; margin-top: 22px; }

    .option-check { font-size: 0.95rem; color: var(--luxe-charcoal); }
    .hint { margin: 14px 0 0; font-size: 0.82rem; font-weight: 300; color: var(--luxe-text-muted); line-height: 1.6; }
    .hint code { background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); border-radius: 4px; padding: 1px 5px; font-size: 0.78rem; }

    .whatsapp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; }
    .wa-block h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; color: var(--luxe-charcoal); }
    .wa-block h4 mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--luxe-text-muted); }
    .wa-block .hint { margin-top: 0; margin-bottom: 16px; }

    .number-row { display: flex; gap: 12px; align-items: flex-start; }
    .number-field { flex: 1; }

    .status { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 10px; margin-bottom: 18px; background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); font-size: 0.82rem; font-weight: 300; line-height: 1.6; color: var(--luxe-text-muted); }
    .status mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; color: var(--luxe-text-muted); }
    .status.ready { background: rgba(37, 211, 102, 0.08); border-color: rgba(37, 211, 102, 0.35); color: var(--luxe-charcoal); }
    .status.ready mat-icon { color: #25D366; }

    @media (max-width: 768px) {
      .settings-container { padding: 20px; }
      .settings-grid { grid-template-columns: 1fr; }
      .number-row { flex-direction: column; }
      .number-row button { width: 100%; }
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  currencies = [
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'USD', symbol: '$', label: 'Dollar US' },
    { code: 'TND', symbol: 'DT', label: 'Dinar Tunisien' }
  ];
  selected = 'EUR';
  current: Currency | null = null;
  saving = false;

  guestCheckout = false;
  savingGuest = false;

  whatsapp: WhatsAppSettings = { number: '', notifyCustomer: false, providerReady: false, autoSend: false };
  whatsappNumber = '';
  notifyCustomer = false;
  savingNumber = false;
  savingNotify = false;

  constructor(private settings: SettingsService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.settings.currency$.subscribe((c: Currency) => {
      this.current = c;
      this.selected = c.code;
    });

    this.settings.guestCheckout$.subscribe((enabled: boolean) => {
      this.guestCheckout = enabled;
    });

    this.settings.whatsapp$.subscribe((w: WhatsAppSettings) => {
      this.whatsapp = w;
      this.whatsappNumber = w.number ? `+${w.number}` : '';
      this.notifyCustomer = w.notifyCustomer;
    });
  }

  get numberChanged(): boolean {
    return this.whatsappNumber.replace(/\D/g, '') !== this.whatsapp.number;
  }

  save() {
    if (this.selected === this.current?.code) return;
    this.saving = true;
    this.settings.setCurrency(this.selected).then(() => {
      this.saving = false;
      this.snackBar.open('Devise mise à jour', 'OK', { duration: 3000 });
    }).catch(() => {
      this.saving = false;
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
    });
  }

  saveGuestCheckout() {
    this.savingGuest = true;
    this.settings.setGuestCheckout(this.guestCheckout).then(enabled => {
      this.savingGuest = false;
      this.snackBar.open(
        enabled ? 'Les clients peuvent commander sans compte' : 'Un compte est désormais requis pour commander',
        'OK',
        { duration: 3000 }
      );
    }).catch(() => {
      this.savingGuest = false;
      this.guestCheckout = this.settings.guestCheckout;
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
    });
  }

  saveNumber() {
    this.savingNumber = true;
    this.settings.save({ whatsappNumber: this.whatsappNumber }).then(() => {
      this.savingNumber = false;
      this.snackBar.open('Numéro WhatsApp enregistré', 'OK', { duration: 3000 });
    }).catch(err => {
      this.savingNumber = false;
      this.snackBar.open(err?.error?.message || 'Numéro invalide', 'Fermer', { duration: 4000 });
    });
  }

  saveNotifyCustomer() {
    this.savingNotify = true;
    this.settings.save({ notifyCustomer: this.notifyCustomer }).then(() => {
      this.savingNotify = false;
      this.snackBar.open(
        this.notifyCustomer ? 'Confirmation automatique activée' : 'Confirmation automatique désactivée',
        'OK',
        { duration: 3000 }
      );
    }).catch(() => {
      this.savingNotify = false;
      this.notifyCustomer = this.settings.whatsapp.notifyCustomer;
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
    });
  }
}
