import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService, Currency, WhatsAppSettings, LoyaltyTier, DEFAULT_LOYALTY_TIERS, DEFAULT_CHECKOUT_FIELDS, CheckoutField, PermissionDef, PermissionGroup } from '../services/settings.service';
import { FormatCurrencyPipe } from '../pipes/format-currency.pipe';
import { ConfirmService } from '../services/confirm.service';

type SettingsFold = 'currency' | 'checkout' | 'whatsapp' | 'loyalty' | 'perms';
const FOLDS_KEY = 'nelya_settings_folds_v4';
const DEFAULT_FOLDS: Record<SettingsFold, boolean> = {
  perms: false, currency: false, checkout: false, whatsapp: false, loyalty: false
};

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatRadioModule,
    MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule,
    MatSnackBarModule, FormatCurrencyPipe
  ],
  template: `
    <div class="settings-page fade-in">
      <p class="lead">Devise, commande, fidélité, WhatsApp et groupes de permissions. Cliquez un titre pour masquer une carte.</p>

      <a class="identity-link" routerLink="/admin/identity">
        <mat-icon>palette</mat-icon>
        <span>
          <strong>Identité du site</strong>
          <small>Logo, couleurs, page d’accueil, textes et coordonnées</small>
        </span>
        <mat-icon>arrow_forward</mat-icon>
      </a>

      <div class="cards">

      <article class="card" [class.open]="isOpen('perms')" [class.wide]="true">
        <button type="button" class="card-head" (click)="toggle('perms')">
          <span class="card-icon"><mat-icon>admin_panel_settings</mat-icon></span>
          <span class="card-titles">
            <h2>Permissions</h2>
            <p>Droits de chaque groupe. Les administrateurs ont toujours tout.</p>
          </span>
          <mat-icon class="chevron">expand_more</mat-icon>
        </button>
        <div class="card-body" *ngIf="isOpen('perms')">

        <div class="perm-create">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nouveau groupe</mat-label>
            <input matInput [(ngModel)]="newGroupName" maxlength="40" placeholder="Ex: Support, Magasin"
              (keydown.enter)="$event.preventDefault(); addGroup()">
          </mat-form-field>
          <button mat-stroked-button type="button" [disabled]="!newGroupName.trim() || savingPerms" (click)="addGroup()">
            <mat-icon>add</mat-icon> Créer un groupe
          </button>
        </div>

        <div class="perm-table-wrap">
          <table class="perm-table">
            <thead>
              <tr>
                <th class="perm-col-label">Action</th>
                <th *ngFor="let group of permissionGroups">
                  <div class="perm-col-head">
                    <input *ngIf="!group.system" class="perm-name" [(ngModel)]="group.name" maxlength="40">
                    <span *ngIf="group.system">{{ group.name }}</span>
                    <small *ngIf="group.system">système</small>
                    <button *ngIf="!group.system" type="button" class="del-group" [disabled]="savingPerms" (click)="removeGroup(group)">
                      <mat-icon>delete</mat-icon> Supprimer
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let section of permissionSections">
                <tr class="perm-section-row">
                  <td [attr.colspan]="1 + permissionGroups.length">{{ section }}</td>
                </tr>
                <tr *ngFor="let perm of permsIn(section)">
                  <td class="perm-col-label">{{ perm.label }}</td>
                  <td *ngFor="let group of permissionGroups" class="perm-cell">
                    <mat-icon *ngIf="group.id === 'admin'" class="perm-locked">check_circle</mat-icon>
                    <mat-checkbox
                      *ngIf="group.id !== 'admin'"
                      [checked]="groupHas(group, perm.key)"
                      (change)="togglePerm(group, perm.key, $event.checked)">
                    </mat-checkbox>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <button mat-flat-button color="primary" class="save-btn" [disabled]="savingPerms" (click)="savePermissionGroups()">
          Enregistrer les groupes
        </button>
        </div>
      </article>

          <article class="card" [class.open]="isOpen('currency')">
            <button type="button" class="card-head" (click)="toggle('currency')">
              <span class="card-icon"><mat-icon>payments</mat-icon></span>
              <span class="card-titles">
                <h2>Devise</h2>
                <p>Les montants restent les mêmes, seul le symbole change.</p>
              </span>
              <mat-icon class="chevron">expand_more</mat-icon>
            </button>
            <div class="card-body" *ngIf="isOpen('currency')">

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
            </div>
          </article>

          <article class="card wide" [class.open]="isOpen('checkout')">
            <button type="button" class="card-head" (click)="toggle('checkout')">
              <span class="card-icon"><mat-icon>shopping_bag</mat-icon></span>
              <span class="card-titles">
                <h2>Commande</h2>
                <p>Compte obligatoire ou invité, et champs du formulaire.</p>
              </span>
              <mat-icon class="chevron">expand_more</mat-icon>
            </button>
            <div class="card-body" *ngIf="isOpen('checkout')">

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

            <h3 class="fields-title">Champs du formulaire de commande</h3>
            <p class="fields-hint">Cochez pour afficher un champ, décochez pour le retirer. Ajoutez les vôtres (ville, étage, code, etc.).</p>

            <div class="field-row" *ngFor="let field of checkoutFields; let i = index">
              <mat-checkbox [(ngModel)]="field.enabled"></mat-checkbox>
              <input class="field-label" [(ngModel)]="field.label" maxlength="80" [placeholder]="'Libellé'">
              <mat-select *ngIf="!field.builtin" class="field-type" [(ngModel)]="field.type">
                <mat-option value="text">Texte</mat-option>
                <mat-option value="textarea">Paragraphe</mat-option>
                <mat-option value="email">Email</mat-option>
                <mat-option value="tel">Téléphone</mat-option>
              </mat-select>
              <span *ngIf="field.builtin" class="field-type-lock">{{ field.guestOnly ? 'Invité' : 'Tous' }}</span>
              <mat-checkbox [(ngModel)]="field.required" [disabled]="!field.enabled">Obligatoire</mat-checkbox>
              <button *ngIf="!field.builtin" type="button" class="icon-btn" (click)="removeCheckoutField(i)" aria-label="Supprimer le champ">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="field-add">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nouveau champ</mat-label>
                <input matInput [(ngModel)]="newFieldLabel" maxlength="80" placeholder="Ex: Ville, étage"
                  (keydown.enter)="$event.preventDefault(); addCheckoutField()">
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="type-pick">
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="newFieldType">
                  <mat-option value="text">Texte</mat-option>
                  <mat-option value="textarea">Paragraphe</mat-option>
                  <mat-option value="email">Email</mat-option>
                  <mat-option value="tel">Téléphone</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button type="button" [disabled]="!newFieldLabel.trim()" (click)="addCheckoutField()">
                <mat-icon>add</mat-icon> Ajouter
              </button>
            </div>
            <button mat-flat-button color="primary" class="save-btn" [disabled]="savingFields" (click)="saveCheckoutFields()">
              Enregistrer les champs
            </button>
            </div>
          </article>

          <article class="card wide" [class.open]="isOpen('whatsapp')">
            <button type="button" class="card-head" (click)="toggle('whatsapp')">
              <span class="card-icon wa"><mat-icon>chat</mat-icon></span>
              <span class="card-titles">
                <h2>WhatsApp</h2>
                <p>Numéro boutique et envoi de confirmation au client.</p>
              </span>
              <mat-icon class="chevron">expand_more</mat-icon>
            </button>
            <div class="card-body wa-pad" *ngIf="isOpen('whatsapp')">

            <div class="wa-body">
              <div class="wa-col">
                <h3>Numéro boutique</h3>
                <p>C’est l’expéditeur du WhatsApp automatique. Une alerte de nouvelle commande peut aussi y arriver.</p>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Indicatif pays inclus</mat-label>
                  <input matInput [(ngModel)]="whatsappNumber" placeholder="+216 22 580 632">
                </mat-form-field>
                <button mat-stroked-button [disabled]="savingNumber || !numberChanged" (click)="saveNumber()">
                  Enregistrer le numéro
                </button>
              </div>

              <div class="wa-col wa-col-confirm">
                <h3>À la commande</h3>
                <p>
                  Deux envois possibles : le client vous envoie le récapitulatif,
                  et/ou le serveur l’envoie au numéro du formulaire.
                </p>
                <mat-checkbox
                  [(ngModel)]="whatsappInvite"
                  (change)="saveWhatsAppInvite()"
                  [disabled]="savingInvite">
                  Autoriser le client à nous envoyer le récapitulatif sur WhatsApp
                </mat-checkbox>
                <mat-checkbox
                  [(ngModel)]="notifyCustomer"
                  (change)="saveNotifyCustomer()"
                  [disabled]="savingNotify">
                  Envoyer automatiquement le récapitulatif au numéro du client
                </mat-checkbox>
                <div class="pill" [class.ok]="whatsapp.providerReady">
                  {{ whatsapp.providerReady
                    ? 'Compte WhatsApp boutique connecté'
                    : 'Compte WhatsApp boutique non connecté' }}
                </div>
                <p class="wa-auto-hint">
                  Pour envoyer <strong>tout de suite sur ton téléphone</strong> (test) :
                  ajoute le contact WhatsApp <strong>+34 623 80 11 90</strong>,
                  envoie <em>I allow callmebot to send me messages</em>,
                  colle la clé API reçue, puis clique Test.
                  CallMeBot n’envoie qu’au numéro qui a reçu la clé.
                </p>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Clé CallMeBot (test)</mat-label>
                  <input matInput [(ngModel)]="callmebotKey" autocomplete="off">
                </mat-form-field>
                <div class="wa-test">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Numéro de test</mat-label>
                    <span matPrefix class="phone-prefix">+216</span>
                    <input matInput [(ngModel)]="testPhoneLocal" maxlength="8" inputmode="numeric" placeholder="20 000 000">
                  </mat-form-field>
                  <button mat-flat-button color="primary" type="button"
                    [disabled]="savingGateway || testingWa || !callmebotKey.trim() || testPhoneLocal.length !== 8"
                    (click)="saveGatewayThenTest()">
                    {{ testingWa ? 'Envoi…' : 'Envoyer un test' }}
                  </button>
                </div>
                <button mat-stroked-button type="button" [disabled]="savingGateway" (click)="saveGateway()">
                  Enregistrer la clé
                </button>
              </div>
            </div>
            </div>
          </article>

        <article class="card wide" [class.open]="isOpen('loyalty')">
          <button type="button" class="card-head" (click)="toggle('loyalty')">
            <span class="card-icon"><mat-icon>loyalty</mat-icon></span>
            <span class="card-titles">
              <h2>Points fidélité</h2>
              <p>Un client connecté gagne des points selon le prix unitaire × la quantité. Les invités n’en reçoivent pas.</p>
            </span>
            <mat-icon class="chevron">expand_more</mat-icon>
          </button>
          <div class="card-body" *ngIf="isOpen('loyalty')">
            <div class="chips light">
              <span class="chip" *ngFor="let t of loyaltyTiers">
                {{ t.min }}–{{ t.max }} {{ currencySymbol }}
                <b>{{ t.points }} pts</b>
              </span>
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
          </div>
        </article>

      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding: 0 0 32px; width: 100%; min-width: 0; }
    .lead { margin: 0 0 20px; color: var(--luxe-text-muted); font-weight: 300; font-size: 0.95rem; }
    .identity-link {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 18px; border-radius: 16px; text-decoration: none;
      background: var(--luxe-black); color: #fff; margin-bottom: 20px;
    }
    .identity-link strong { display: block; font-size: 0.95rem; }
    .identity-link small { display: block; color: rgba(255,255,255,0.65); margin-top: 2px; }
    .identity-link > span { flex: 1; }
    .identity-link mat-icon { color: var(--luxe-gold); }

    .cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
      align-items: start;
    }
    .card {
      background: var(--luxe-white);
      border: 1px solid var(--luxe-border);
      border-radius: 16px;
      box-shadow: var(--shadow-subtle);
      overflow: hidden;
      min-width: 0;
    }
    .card.wide { grid-column: 1 / -1; }
    .card-head {
      width: 100%; display: flex; align-items: center; gap: 14px;
      padding: 16px 18px; border: none; background: var(--luxe-white);
      cursor: pointer; text-align: left; font-family: inherit;
      border-bottom: 1px solid transparent;
    }
    .card.open .card-head { border-bottom-color: var(--luxe-border); background: #faf9f6; }
    .card-head:hover { background: #faf9f6; }
    .card-icon {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--luxe-offwhite); color: var(--luxe-gold);
    }
    .card-icon.wa { background: #ecf8ef; color: #25D366; }
    .card-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .card-titles { flex: 1; min-width: 0; }
    .card-titles h2 {
      margin: 0; font-family: var(--font-heading); font-weight: 500;
      font-size: 1.15rem; color: var(--luxe-black);
    }
    .card-titles p {
      margin: 4px 0 0; font-size: 0.8rem; font-weight: 300;
      color: var(--luxe-text-muted); line-height: 1.4;
    }
    .chevron {
      color: var(--luxe-text-muted); transition: transform 0.2s ease; flex-shrink: 0;
    }
    .card.open .chevron { transform: rotate(180deg); color: var(--luxe-gold); }
    .card-body { padding: 20px 22px 22px; display: flex; flex-direction: column; }
    .card-body.wa-pad { padding: 0; }
    .wa-col h3 {
      margin: 0 0 10px; font-family: var(--font-heading); font-weight: 500; color: var(--luxe-black);
      font-size: 0.78rem; letter-spacing: 1.4px; text-transform: uppercase;
    }
    .wa-col p {
      margin: 0 0 16px; font-size: 0.82rem; font-weight: 300; color: var(--luxe-text-muted); line-height: 1.55;
    }

    .currency-list { display: flex; flex-direction: column; gap: 8px; margin: 0 0 16px; }
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
    .hero-preview {
      margin: 0 0 14px; border-radius: 12px; overflow: hidden;
      border: 1px solid var(--luxe-border); background: var(--luxe-offwhite);
      aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center;
    }
    .hero-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hero-preview span { color: var(--luxe-text-muted); font-size: 0.85rem; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .site-mod {
      padding: 0 0 22px; margin: 0 0 22px;
      border-bottom: 1px solid var(--luxe-border);
    }
    .site-mod.last { border-bottom: none; margin: 0; padding: 0; }
    .site-mod h3 {
      margin: 0 0 6px; font-size: 0.78rem; letter-spacing: 1.4px;
      text-transform: uppercase; color: var(--luxe-black); font-weight: 700;
    }
    .site-mod .hint {
      margin: 0 0 14px; font-size: 0.8rem; font-weight: 300;
      color: var(--luxe-text-muted); line-height: 1.45;
    }
    .logo-preview {
      margin: 0 0 14px; border: 1px solid var(--luxe-border);
      background: #f7f4ec; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-preview.round { width: 88px; height: 88px; border-radius: 50%; }
    .logo-preview.rect { width: 148px; height: 148px; border-radius: 14px; }
    .logo-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .logo-preview.rect img { object-fit: contain; }
    .tagline-field { width: 100%; }

    .choice-list { display: flex; flex-direction: column; gap: 10px; margin-top: 0; }
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
    .fields-title { margin: 22px 0 4px; font-size: 0.78rem; letter-spacing: 1.4px; text-transform: uppercase; color: var(--luxe-black); }
    .fields-hint { margin: 0 0 12px; font-size: 0.8rem; color: var(--luxe-text-muted); font-weight: 300; line-height: 1.45; }
    .field-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 0; border-bottom: 1px solid var(--luxe-border);
    }
    .field-label {
      flex: 1; min-width: 140px; padding: 8px 10px; border: 1px solid var(--luxe-border); border-radius: 8px;
      font-family: var(--font-body); font-size: 0.88rem; color: var(--luxe-black); outline: none; background: #fff;
    }
    .field-label:focus { border-color: var(--luxe-gold); }
    .field-type { width: 120px; font-size: 0.82rem; }
    .field-type-lock { font-size: 0.72rem; color: var(--luxe-text-muted); min-width: 48px; }
    .field-add { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px 0 16px; }
    .field-add .type-pick { width: 140px; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
    .chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px; border-radius: 999px;
      background: var(--luxe-offwhite); border: 1px solid var(--luxe-border);
      font-size: 0.78rem; color: var(--luxe-charcoal);
    }
    .chip b { color: var(--luxe-black); font-weight: 700; }

    .loyalty-editor { padding: 0; }
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

    .wa-body { display: flex; flex-direction: column; }
    .wa-col { padding: 18px 22px 20px; }
    .wa-col-confirm { border-top: 1px solid var(--luxe-border); }
    .wa-col h3 { font-size: 0.78rem; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 10px; }
    .wa-col mat-checkbox { display: block; margin: 4px 0 14px; }
    .full { width: 100%; }
    .pill {
      display: inline-block; margin-bottom: 12px; padding: 6px 12px; border-radius: 999px;
      font-size: 0.75rem; font-weight: 600; background: var(--luxe-offwhite); color: var(--luxe-text-muted);
    }
    .pill.ok { background: rgba(37,211,102,0.12); color: #1b7a3d; }
    .wa-auto-hint { margin-top: 10px; }
    .wa-test { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 8px 0 12px; }
    .wa-test mat-form-field { min-width: 200px; flex: 1; }
    .phone-prefix { font-weight: 600; padding-right: 6px; }
    code { background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); border-radius: 4px; padding: 1px 5px; font-size: 0.75rem; }

    .perm-create { display: flex; gap: 12px; align-items: center; margin: 0 0 16px; flex-wrap: wrap; }
    .perm-create mat-form-field { min-width: 240px; flex: 1; max-width: 360px; }
    .perm-table-wrap { overflow-x: auto; border: 1px solid var(--luxe-border); border-radius: 10px; background: #fff; }
    .perm-table { width: 100%; min-width: 560px; border-collapse: collapse; }
    .perm-table th, .perm-table td { padding: 12px 14px; border-bottom: 1px solid var(--luxe-border); vertical-align: middle; }
    .perm-table thead th { background: var(--luxe-offwhite); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }
    .perm-col-label { text-align: left !important; min-width: 240px; font-weight: 500; color: var(--luxe-black); }
    .perm-col-head { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .perm-col-head small { font-size: 0.65rem; letter-spacing: 1px; color: var(--luxe-gold); text-transform: uppercase; }
    .perm-name {
      width: 120px; text-align: center; border: 1px solid var(--luxe-border); border-radius: 6px;
      padding: 6px 8px; font-family: var(--font-body); font-size: 0.85rem;
    }
    .del-group {
      display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;
      border: none; background: transparent; cursor: pointer;
      color: #c62828; font-size: 0.72rem; font-family: var(--font-body);
    }
    .del-group:hover:not(:disabled) { text-decoration: underline; }
    .del-group:disabled { opacity: 0.4; cursor: wait; }
    .del-group mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .perm-section-row td {
      background: var(--luxe-offwhite); font-size: 0.68rem; letter-spacing: 1.4px;
      text-transform: uppercase; color: var(--luxe-text-muted); font-weight: 700;
    }
    .perm-cell { text-align: center; }
    .perm-locked { color: var(--luxe-gold); font-size: 22px; width: 22px; height: 22px; }

    @media (max-width: 960px) {
      .cards { grid-template-columns: 1fr; }
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
  checkoutFields: CheckoutField[] = DEFAULT_CHECKOUT_FIELDS.map((f) => ({ ...f }));
  newFieldLabel = '';
  newFieldType: CheckoutField['type'] = 'text';
  savingFields = false;

  whatsapp: WhatsAppSettings = { number: '', invite: true, notifyCustomer: false, providerReady: false, autoSend: false };
  whatsappNumber = '';
  whatsappInvite = true;
  notifyCustomer = false;
  savingNumber = false;
  savingInvite = false;
  savingNotify = false;
  callmebotKey = '';
  testPhoneLocal = '';
  savingGateway = false;
  testingWa = false;

  loyaltyTiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS.map(t => ({ ...t }));
  savingLoyalty = false;

  permissionCatalog: PermissionDef[] = [
    { key: 'admin.access', section: 'Accès', label: 'Voir l’espace administration' },
    { key: 'orders.update_status', section: 'Commandes', label: 'Changer le statut (attente, confirmée, expédiée, livrée)' },
    { key: 'orders.cancel', section: 'Commandes', label: 'Annuler une commande' },
    { key: 'products.manage', section: 'Catalogue', label: 'Créer et modifier les produits' },
    { key: 'stock.manage', section: 'Catalogue', label: 'Ajuster le stock' },
    { key: 'categories.manage', section: 'Catalogue', label: 'Gérer les catégories' },
    { key: 'reviews.manage', section: 'Avis', label: 'Gérer les avis et témoignages' },
    { key: 'audit.view', section: 'Historique', label: 'Consulter l’historique des actions' }
  ];
  permissionGroups: PermissionGroup[] = [
    { id: 'admin', name: 'Administrateur', system: true, permissions: ['*'] },
    { id: 'seller', name: 'Employé', system: true, permissions: ['admin.access', 'orders.update_status', 'orders.cancel', 'products.manage', 'stock.manage', 'categories.manage', 'reviews.manage'] }
  ];
  newGroupName = '';
  savingPerms = false;
  folds: Record<SettingsFold, boolean> = { ...DEFAULT_FOLDS };

  constructor(
    private settings: SettingsService,
    private snackBar: MatSnackBar,
    private confirm: ConfirmService
  ) {}

  get currencySymbol(): string {
    return this.current?.symbol || 'DT';
  }

  ngOnInit() {
    this.restoreFolds();
    this.settings.currency$.subscribe((c: Currency) => {
      this.current = c;
      this.selected = c.code;
    });

    this.settings.guestCheckout$.subscribe((enabled: boolean) => {
      this.guestCheckout = enabled;
    });

    this.settings.checkoutFields$.subscribe((fields) => {
      this.checkoutFields = (fields || DEFAULT_CHECKOUT_FIELDS).map((f) => ({ ...f }));
    });

    this.settings.whatsapp$.subscribe((w: WhatsAppSettings) => {
      this.whatsapp = w;
      this.whatsappNumber = w.number ? `+${w.number}` : '';
      this.whatsappInvite = w.invite !== false;
      this.notifyCustomer = w.notifyCustomer;
    });

    this.settings.loyaltyTiers$.subscribe((tiers: LoyaltyTier[]) => {
      this.loyaltyTiers = (tiers || DEFAULT_LOYALTY_TIERS).map(t => ({ ...t }));
    });

    this.settings.loadAccess().then((access) => {
      if (access.catalog?.length) this.permissionCatalog = access.catalog;
      if (access.groups?.length) {
        this.permissionGroups = access.groups.map((g) => ({ ...g, permissions: [...(g.permissions || [])] }));
      }
      if (access.whatsappGateway) {
        this.callmebotKey = access.whatsappGateway.callmebotKey || '';
      }
    }).catch(() => {});
  }

  isOpen(id: SettingsFold): boolean {
    return this.folds[id] !== false;
  }

  toggle(id: SettingsFold) {
    this.folds = { ...this.folds, [id]: !this.isOpen(id) };
    localStorage.setItem(FOLDS_KEY, JSON.stringify(this.folds));
  }

  private restoreFolds() {
    try {
      const raw = JSON.parse(localStorage.getItem(FOLDS_KEY) || '');
      if (raw && typeof raw === 'object') this.folds = { ...DEFAULT_FOLDS, ...raw };
    } catch { /* ignore */ }
  }

  get permissionSections(): string[] {
    return [...new Set(this.permissionCatalog.map((p) => p.section))];
  }

  permsIn(section: string): PermissionDef[] {
    return this.permissionCatalog.filter((p) => p.section === section);
  }

  groupHas(group: PermissionGroup, key: string): boolean {
    return group.permissions?.includes('*') || group.permissions?.includes(key);
  }

  togglePerm(group: PermissionGroup, key: string, checked: boolean) {
    const current = new Set(group.permissions.filter((p) => p !== '*'));
    if (checked) current.add(key);
    else current.delete(key);
    group.permissions = [...current];
  }

  addGroup() {
    const name = this.newGroupName.trim();
    if (!name || this.savingPerms) return;
    this.permissionGroups = [
      ...this.permissionGroups,
      {
        id: `grp_${Date.now().toString(36)}`,
        name,
        system: false,
        permissions: ['admin.access', 'orders.update_status']
      }
    ];
    this.newGroupName = '';
    this.savePermissionGroups(`Groupe « ${name} » créé`);
  }

  async removeGroup(group: PermissionGroup) {
    if (group.system || this.savingPerms) return;
    const ok = await this.confirm.ask({
      danger: true,
      title: `Supprimer « ${group.name} » ?`,
      message: 'Les employés de ce groupe repasseront sur Employé.',
      confirmLabel: 'Supprimer'
    });
    if (!ok) return;
    const previous = this.permissionGroups;
    this.permissionGroups = this.permissionGroups.filter((g) => g.id !== group.id);
    this.savePermissionGroups(`Groupe « ${group.name} » supprimé`, previous);
  }

  savePermissionGroups(okMessage = 'Groupes de permissions enregistrés', restoreOnError?: PermissionGroup[]) {
    this.savingPerms = true;
    this.settings.savePermissionGroups(this.permissionGroups).then((access) => {
      this.savingPerms = false;
      if (access.groups?.length) {
        this.permissionGroups = access.groups.map((g) => ({ ...g, permissions: [...(g.permissions || [])] }));
      }
      this.snackBar.open(okMessage, 'OK', { duration: 3000 });
    }).catch((err) => {
      this.savingPerms = false;
      if (restoreOnError) this.permissionGroups = restoreOnError;
      this.snackBar.open(this.saveError(err), 'Fermer', { duration: 5000 });
    });
  }

  private saveError(err: any): string {
    if (err?.status === 0) return 'API injoignable. Relancez le serveur backend puis réessayez.';
    return err?.error?.message || 'Enregistrement impossible';
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

  addCheckoutField() {
    const label = this.newFieldLabel.trim();
    if (!label || this.checkoutFields.length >= 16) return;
    this.checkoutFields = [...this.checkoutFields, {
      id: `c_${Date.now().toString(36)}`,
      type: this.newFieldType,
      label,
      enabled: true,
      required: false,
      builtin: false,
      guestOnly: false
    }];
    this.newFieldLabel = '';
  }

  removeCheckoutField(index: number) {
    if (this.checkoutFields[index]?.builtin) return;
    this.checkoutFields = this.checkoutFields.filter((_, i) => i !== index);
  }

  saveCheckoutFields() {
    this.savingFields = true;
    this.settings.save({ checkoutFields: this.checkoutFields }).then(() => {
      this.savingFields = false;
      this.snackBar.open('Champs du formulaire enregistrés', 'OK', { duration: 3000 });
    }).catch((err) => {
      this.savingFields = false;
      this.snackBar.open(err?.error?.message || 'Impossible d’enregistrer les champs', 'Fermer', { duration: 4000 });
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

  saveGateway() {
    this.savingGateway = true;
    return this.settings.save({ callmebotKey: this.callmebotKey }).then(() => {
      this.savingGateway = false;
      this.snackBar.open('Clé WhatsApp enregistrée', 'OK', { duration: 3000 });
    }).catch(() => {
      this.savingGateway = false;
      this.snackBar.open('Impossible d’enregistrer la clé', 'Fermer', { duration: 4000 });
    });
  }

  saveGatewayThenTest() {
    this.savingGateway = true;
    this.settings.save({ callmebotKey: this.callmebotKey }).then(() => {
      this.savingGateway = false;
      this.sendWhatsAppTest();
    }).catch(() => {
      this.savingGateway = false;
      this.snackBar.open('Impossible d’enregistrer la clé', 'Fermer', { duration: 4000 });
    });
  }

  sendWhatsAppTest() {
    this.testingWa = true;
    this.settings.testWhatsApp(`+216${this.testPhoneLocal}`).then((res) => {
      this.testingWa = false;
      this.snackBar.open(`Test envoyé vers ${res.to}`, 'OK', { duration: 4000 });
    }).catch((err) => {
      this.testingWa = false;
      this.snackBar.open(err?.error?.message || 'Test WhatsApp impossible', 'Fermer', { duration: 6000 });
    });
  }

  saveWhatsAppInvite() {
    this.savingInvite = true;
    this.settings.save({ whatsappInvite: this.whatsappInvite }).then(() => {
      this.savingInvite = false;
      this.snackBar.open(
        this.whatsappInvite
          ? 'Le client pourra vous envoyer le récapitulatif sur WhatsApp'
          : 'Pas d’envoi du récapitulatif par le client',
        'OK',
        { duration: 3500 }
      );
    }).catch(() => {
      this.savingInvite = false;
      this.whatsappInvite = this.settings.whatsapp.invite !== false;
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
    });
  }

  saveNotifyCustomer() {
    this.savingNotify = true;
    this.settings.save({ notifyCustomer: this.notifyCustomer }).then(() => {
      this.savingNotify = false;
      this.snackBar.open(
        this.notifyCustomer
          ? 'Le récapitulatif partira automatiquement au numéro du client'
          : 'Pas d’envoi automatique au client',
        'OK',
        { duration: 3500 }
      );
    }).catch(() => {
      this.savingNotify = false;
      this.notifyCustomer = this.settings.whatsapp.notifyCustomer;
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 4000 });
    });
  }

}
