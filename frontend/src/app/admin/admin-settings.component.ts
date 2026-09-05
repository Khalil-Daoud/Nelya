import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService, Currency } from '../services/settings.service';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatRadioModule, FormsModule, MatSnackBarModule, FormatCurrencyPipe],
  template: `
    <div class="settings-container fade-in">
      <div class="header">
        <h2 class="luxury-title">Paramètres de la boutique</h2>
        <p>Configurez la devise affichée sur tout le site.</p>
      </div>

      <mat-card class="settings-card glass-panel">
        <mat-card-header>
          <mat-icon mat-card-avatar>payments</mat-icon>
          <mat-card-title>Devise</mat-card-title>
          <mat-card-subtitle>Les prix existants gardent leur valeur numérique, seul le symbole change.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-radio-group [(ngModel)]="selected" class="currency-list">
            <mat-radio-button *ngFor="let c of currencies" [value]="c.code" class="currency-option">
              <span class="currency-symbol">{{c.symbol}}</span>
              <span class="currency-name">{{c.label}}</span>
              <span class="currency-code">{{c.code}}</span>
            </mat-radio-button>
          </mat-radio-group>

          <div class="preview">
            <span class="preview-label">Aperçu d'un prix :</span>
            <span class="preview-value">{{ 25 | formatCurrency }}</span>
          </div>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-raised-button color="primary" [disabled]="selected === current?.code || saving" (click)="save()">
            <mat-icon>save</mat-icon> Enregistrer
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container { padding: 40px; }
    .header { margin-bottom: 40px; }
    .header h2 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { color: #666; font-weight: 300; }

    .settings-card { padding: 25px; border-radius: 12px; max-width: 620px; }
    mat-card-header { margin-bottom: 20px; }
    mat-card-header mat-icon { color: var(--luxe-gold); }
    mat-card-title { font-size: 1.2rem !important; font-weight: 600 !important; }
    mat-card-subtitle { font-weight: 300 !important; }

    .currency-list { display: flex; flex-direction: column; gap: 6px; }
    .currency-option { display: flex; align-items: center; padding: 14px; border: 1px solid var(--luxe-border); border-radius: 10px; margin: 6px 0; transition: var(--transition-smooth); }
    .currency-symbol { font-size: 1.3rem; font-weight: 700; color: var(--luxe-black); margin-right: 15px; min-width: 28px; }
    .currency-name { flex: 1; font-size: 0.95rem; color: var(--luxe-charcoal); }
    .currency-code { font-size: 0.75rem; color: var(--luxe-text-muted); letter-spacing: 1px; }

    .preview { margin-top: 25px; padding: 18px 22px; background: var(--luxe-offwhite); border-radius: 10px; display: flex; align-items: center; gap: 15px; }
    .preview-label { font-size: 0.8rem; color: var(--luxe-text-muted); }
    .preview-value { font-size: 1.4rem; font-weight: 700; color: var(--luxe-black); font-family: var(--font-heading); }

    @media (max-width: 768px) {
      .settings-container { padding: 20px; }
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

  constructor(private settings: SettingsService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.settings.currency$.subscribe((c: Currency) => {
      this.current = c;
      this.selected = c.code;
    });
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
}
