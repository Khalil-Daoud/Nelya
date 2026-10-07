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
import { SettingsService, Currency, WhatsAppSettings, LoyaltyTier, DEFAULT_LOYALTY_TIERS } from '../services/settings.service';
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
    <div class="settings-page fade-in">
      <p class="lead">Devise, commande, fidélité et WhatsApp — chaque bloc a son rôle.</p>

      <div class="layout">

        <!-- Colonne gauche : boutique -->
        <div class="stack">
          <section class="panel">
            <header class="panel-head">
              <h2>Devise</h2>
              <p>Les montants restent les mêmes, seul le symbole change.</p>
            </header>

            <mat-radio-group [(ngModel)]="selected" class="currency-list">
              <mat-radio-button *ngFor="let c of currencies" [value]="c.code" class="currency-option">
                <span class="currency-symbol">{{c.symbol}}</span>
                <span class="currency-name">{{c.label}}</span>
                <span class="currency-code">{{c.code}}</span>
              </mat-radio-button>
            </mat-radio-group>

            <div class="preview">
              <span>Aperçu</span>
              <strong>{{ 25 | formatCurrency }}</strong>
            </div>

            <button mat-flat-button color="primary" class="save-btn"
              [disabled]="selected === current?.code || saving" (click)="save()">
              Enregistrer la devise
            </button>
          </section>

          <section class="panel">
            <header class="panel-head">
              <h2>Commande</h2>
              <p>Qui a le droit de valider un panier.</p>
            </header>

            <div class="choice-list">
              <button type="button" class="choice" [class.on]="!guestCheckout" [disabled]="savingGuest"
                (click)="setGuest(false)">
                <mat-icon>lock</mat-icon>
                <span>
                  <strong>Compte obligatoire</strong>
                  <small>Connexion avant paiement</small>
                </span>
              </button>
              <button type="button" class="choice" [class.on]="guestCheckout" [disabled]="savingGuest"
                (click)="setGuest(true)">
                <mat-icon>person_outline</mat-icon>
                <span>
                  <strong>Invité autorisé</strong>
                  <small>Nom, email et téléphone — récapitulatif + lien de suivi</small>
                </span>
              </button>
            </div>
          </section>

          <section class="whatsapp">
            <div class="wa-banner">
              <mat-icon>chat</mat-icon>
              <div>
                <h2>WhatsApp</h2>
                <p>Le numéro de la boutique, et l’envoi de confirmation au client.</p>
              </div>
            </div>

            <div class="wa-body">
              <div class="wa-col">
                <h3>Numéro boutique</h3>
                <p>Chaque commande y arrive. C’est aussi le destinataire si le client envoie lui-même le récapitulatif.</p>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Indicatif pays inclus</mat-label>
                  <input matInput [(ngModel)]="whatsappNumber" placeholder="+216 22 580 632">
                </mat-form-field>
                <button mat-stroked-button [disabled]="savingNumber || !numberChanged" (click)="saveNumber()">
                  Enregistrer le numéro
                </button>
              </div>

              <div class="wa-col wa-col-confirm">
                <h3>Confirmation client</h3>
                <div class="pill" [class.ok]="whatsapp.providerReady">
                  {{ whatsapp.providerReady
                    ? 'Envoi automatique disponible'
                    : 'Envoi automatique indisponible' }}
                </div>
                <p *ngIf="!whatsapp.providerReady">
                  Après validation, le client est invité à vous envoyer le message dans WhatsApp.
                  Les invités reçoivent aussi un email de suivi si
                  <code>SMTP_HOST</code> et <code>SMTP_FROM</code> sont configurés.
                  Pour WhatsApp automatique : <code>WHATSAPP_CLOUD_TOKEN</code> et
                  <code>WHATSAPP_CLOUD_PHONE_ID</code>, ou Twilio.
                </p>
                <p *ngIf="whatsapp.providerReady">
                  Le client reçoit sa confirmation sans ouvrir WhatsApp.
                </p>
                <mat-checkbox
                  [(ngModel)]="notifyCustomer"
                  (change)="saveNotifyCustomer()"
                  [disabled]="savingNotify || !whatsapp.providerReady">
                  Envoyer automatiquement
                </mat-checkbox>
              </div>
            </div>
          </section>
        </div>

        <!-- Fidélité : autre langage visuel, table + résumé -->
        <section class="loyalty">
          <div class="loyalty-intro">
            <span class="eyebrow">Programme</span>
            <h2>Points fidélité</h2>
            <p>
              Un client connecté gagne des points selon le <em>prix unitaire</em> × la quantité.
              Les invités n’en reçoivent pas.
            </p>
            <div class="chips">
              <span class="chip" *ngFor="let t of loyaltyTiers">
                {{ t.min }}–{{ t.max }} {{ currencySymbol }}
                <b>{{ t.points }} pts</b>
              </span>
            </div>
          </div>

          <div class="loyalty-editor">
            <p class="rule">Le premier palier qui contient le prix s’applique (minimum inclus).</p>

            <div class="tier" *ngFor="let tier of loyaltyTiers; let i = index">
              <span class="tier-n">{{ i + 1 }}</span>
              <div class="tier-fields">
                <label>De
                  <input type="number" min="0" step="0.01" [(ngModel)]="tier.min">
                </label>
                <label>à
                  <input type="number" min="0" step="0.01" [(ngModel)]="tier.max">
                </label>
                <span class="unit">{{ currencySymbol }}</span>
                <span class="arrow">→</span>
                <label class="pts">
                  <input type="number" min="0" step="1" [(ngModel)]="tier.points">
                  <span>pts</span>
                </label>
              </div>
              <button type="button" class="icon-btn" (click)="removeTier(i)"
                [disabled]="loyaltyTiers.length <= 1" aria-label="Supprimer le palier">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="loyalty-bar">
              <button mat-stroked-button type="button" (click)="addTier()" [disabled]="loyaltyTiers.length >= 20">
                <mat-icon>add</mat-icon> Palier
              </button>
              <button mat-flat-button color="primary" [disabled]="savingLoyalty" (click)="saveLoyalty()">
                Enregistrer
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding: 0 0 32px; width: 100%; min-width: 0; }
    .lead { margin: 0 0 28px; color: var(--luxe-text-muted); font-weight: 300; font-size: 0.95rem; }

    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) minmax(360px, 1fr);
      gap: 22px;
      align-items: start;
    }
    .stack { display: flex; flex-direction: column; gap: 22px; }

    .panel, .loyalty, .whatsapp {
      background: var(--luxe-white);
      border: 1px solid var(--luxe-border);
      border-radius: 16px;
      box-shadow: var(--shadow-subtle);
    }
    .panel { padding: 24px; display: flex; flex-direction: column; }
    .panel-head h2, .loyalty-intro h2, .wa-banner h2, .wa-col h3 {
      margin: 0 0 6px; font-family: var(--font-heading); font-weight: 500; color: var(--luxe-black);
    }
    .panel-head h2 { font-size: 1.35rem; }
    .panel-head p, .loyalty-intro p, .wa-banner p, .wa-col p {
      margin: 0; font-size: 0.82rem; font-weight: 300; color: var(--luxe-text-muted); line-height: 1.55;
    }

    .currency-list { display: flex; flex-direction: column; gap: 8px; margin: 18px 0 16px; }
    .currency-option {
      display: flex; align-items: center; padding: 12px 14px;
      border: 1px solid var(--luxe-border); border-radius: 10px; margin: 0;
    }
    .currency-symbol { font-size: 1.2rem; font-weight: 700; margin-right: 12px; min-width: 26px; }
    .currency-name { flex: 1; font-size: 0.92rem; }
    .currency-code { font-size: 0.72rem; letter-spacing: 1px; color: var(--luxe-text-muted); }

    .preview {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: var(--luxe-offwhite); border-radius: 10px; margin-bottom: 16px;
    }
    .preview span { font-size: 0.78rem; color: var(--luxe-text-muted); }
    .preview strong { font-family: var(--font-heading); font-size: 1.25rem; }
    .save-btn { align-self: stretch; }

    .choice-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
    .choice {
      display: flex; align-items: center; gap: 14px; text-align: left;
      padding: 14px 16px; border-radius: 12px; cursor: pointer;
      border: 1px solid var(--luxe-border); background: var(--luxe-white);
      font-family: var(--font-body); transition: border-color 0.2s ease, background 0.2s ease;
    }
    .choice mat-icon { color: var(--luxe-text-muted); }
    .choice span { display: flex; flex-direction: column; gap: 2px; }
    .choice strong { font-size: 0.92rem; color: var(--luxe-black); font-weight: 600; }
    .choice small { font-size: 0.78rem; color: var(--luxe-text-muted); font-weight: 300; }
    .choice.on { border-color: var(--luxe-black); background: var(--luxe-offwhite); }
    .choice.on mat-icon { color: var(--luxe-gold); }
    .choice:disabled { opacity: 0.6; cursor: wait; }

    .loyalty { display: flex; flex-direction: column; overflow: hidden; }
    .loyalty-intro {
      padding: 26px 26px 20px;
      background: linear-gradient(160deg, #1a1a1a 0%, #2c2c2c 100%);
      color: #fff;
    }
    .eyebrow {
      display: inline-block; font-size: 0.68rem; letter-spacing: 2.5px; text-transform: uppercase;
      color: var(--luxe-gold); font-weight: 600; margin-bottom: 8px;
    }
    .loyalty-intro h2 { color: #fff; font-size: 1.55rem; }
    .loyalty-intro p { color: rgba(255,255,255,0.72); margin-top: 8px; }
    .loyalty-intro em { font-style: normal; color: var(--luxe-gold); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px; border-radius: 999px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(212,175,55,0.35);
      font-size: 0.78rem; color: rgba(255,255,255,0.85);
    }
    .chip b { color: var(--luxe-gold); font-weight: 700; }

    .loyalty-editor { padding: 18px 22px 22px; }
    .rule { margin: 0 0 14px; font-size: 0.78rem; color: var(--luxe-text-muted); font-weight: 300; }
    .tier {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid var(--luxe-border);
    }
    .tier-n {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--luxe-offwhite); font-size: 0.72rem; font-weight: 700; color: var(--luxe-charcoal);
    }
    .tier-fields { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; flex: 1; min-width: 0; }
    .tier-fields label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--luxe-text-muted); }
    .tier-fields input {
      width: 78px; padding: 8px 10px; border: 1px solid var(--luxe-border); border-radius: 8px;
      font-family: var(--font-body); font-size: 0.9rem; color: var(--luxe-black); outline: none; background: #fff;
    }
    .tier-fields input:focus { border-color: var(--luxe-gold); }
    .unit, .arrow { font-size: 0.8rem; color: var(--luxe-text-muted); }
    .pts { font-weight: 600; color: var(--luxe-black) !important; }
    .pts input { width: 64px; }
    .icon-btn {
      border: none; background: transparent; cursor: pointer; color: var(--luxe-text-muted);
      width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover:not(:disabled) { background: var(--luxe-offwhite); color: #c62828; }
    .icon-btn:disabled { opacity: 0.3; cursor: default; }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .loyalty-bar { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; flex-wrap: wrap; }

    .wa-banner {
      display: flex; gap: 14px; align-items: center;
      padding: 20px 26px; background: #ecf8ef; border-bottom: 1px solid #cfeedd;
    }
    .wa-banner mat-icon { font-size: 28px; width: 28px; height: 28px; color: #25D366; }
    .wa-banner h2 { font-size: 1.35rem; }
    .wa-body { display: flex; flex-direction: column; }
    .wa-col { padding: 18px 22px 20px; }
    .wa-col-confirm { border-top: 1px solid var(--luxe-border); }
    .wa-col h3 { font-size: 0.78rem; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 10px; }
    .wa-col p { margin-bottom: 16px; }
    .full { width: 100%; }
    .pill {
      display: inline-block; margin-bottom: 12px; padding: 6px 12px; border-radius: 999px;
      font-size: 0.75rem; font-weight: 600; background: var(--luxe-offwhite); color: var(--luxe-text-muted);
    }
    .pill.ok { background: rgba(37,211,102,0.12); color: #1b7a3d; }
    code { background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); border-radius: 4px; padding: 1px 5px; font-size: 0.75rem; }

    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .settings-page { padding: 0 0 32px; }
      .tier-fields input { width: 64px; }
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

  loyaltyTiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS.map(t => ({ ...t }));
  savingLoyalty = false;

  constructor(private settings: SettingsService, private snackBar: MatSnackBar) {}

  get currencySymbol(): string {
    return this.current?.symbol || 'DT';
  }

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

    this.settings.loyaltyTiers$.subscribe((tiers: LoyaltyTier[]) => {
      this.loyaltyTiers = (tiers || DEFAULT_LOYALTY_TIERS).map(t => ({ ...t }));
    });
  }

  addTier() {
    const last = this.loyaltyTiers[this.loyaltyTiers.length - 1];
    const min = last ? Number(last.max) || 0 : 0;
    this.loyaltyTiers = [...this.loyaltyTiers, { min, max: min + 50, points: 10 }];
  }

  removeTier(index: number) {
    if (this.loyaltyTiers.length <= 1) return;
    this.loyaltyTiers = this.loyaltyTiers.filter((_, i) => i !== index);
  }

  saveLoyalty() {
    this.savingLoyalty = true;
    this.settings.save({ loyaltyTiers: this.loyaltyTiers }).then(() => {
      this.savingLoyalty = false;
      this.snackBar.open('Paliers de fidélité enregistrés', 'OK', { duration: 3000 });
    }).catch(err => {
      this.savingLoyalty = false;
      this.snackBar.open(err?.error?.message || 'Paliers invalides', 'Fermer', { duration: 5000 });
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

  setGuest(enabled: boolean) {
    if (this.guestCheckout === enabled) return;
    this.guestCheckout = enabled;
    this.saveGuestCheckout();
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
