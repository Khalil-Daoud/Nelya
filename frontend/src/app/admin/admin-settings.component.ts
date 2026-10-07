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
import { SettingsService, Currency, WhatsAppSettings, LoyaltyTier, DEFAULT_LOYALTY_TIERS, PermissionDef, PermissionGroup } from '../services/settings.service';
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
      <p class="lead">Devise, commande, fidélité, WhatsApp et groupes de permissions.</p>

      <section class="perms">
        <header class="panel-head">
          <h2>Table des permissions</h2>
          <p>
            Cochez ce que chaque groupe a le droit de faire.
            Les administrateurs ont toujours tout. Assignez un groupe à un employé dans <strong>Clients &amp; Employés</strong>.
          </p>
        </header>

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
      </section>

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
              <p>Qui a le droit de valider un panier. Toute commande est enregistrée en « En attente » jusqu’à ce que vous changiez le statut.</p>
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
                <p>
                  WhatsApp n’est pas obligatoire. Sans WhatsApp, la commande reste visible ici en
                  <strong>En attente</strong> — vous la confirmez dans le tableau Commandes.
                  Les invités reçoivent aussi un email de suivi si
                  <code>SMTP_HOST</code> et <code>SMTP_FROM</code> sont configurés.
                </p>
                <mat-checkbox
                  [(ngModel)]="whatsappInvite"
                  (change)="saveWhatsAppInvite()"
                  [disabled]="savingInvite">
                  Proposer WhatsApp après la commande
                </mat-checkbox>
                <div class="pill" [class.ok]="whatsapp.providerReady">
                  {{ whatsapp.providerReady
                    ? 'Envoi automatique disponible'
                    : 'Envoi automatique indisponible' }}
                </div>
                <p *ngIf="!whatsapp.providerReady" class="wa-auto-hint">
                  Pour envoyer le message à la place du client :
                  <code>WHATSAPP_CLOUD_TOKEN</code> et <code>WHATSAPP_CLOUD_PHONE_ID</code>, ou Twilio.
                </p>
                <mat-checkbox
                  *ngIf="whatsappInvite"
                  [(ngModel)]="notifyCustomer"
                  (change)="saveNotifyCustomer()"
                  [disabled]="savingNotify || !whatsapp.providerReady">
                  Envoyer automatiquement (API WhatsApp)
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
    .wa-col mat-checkbox { display: block; margin: 4px 0 14px; }
    .full { width: 100%; }
    .pill {
      display: inline-block; margin-bottom: 12px; padding: 6px 12px; border-radius: 999px;
      font-size: 0.75rem; font-weight: 600; background: var(--luxe-offwhite); color: var(--luxe-text-muted);
    }
    .pill.ok { background: rgba(37,211,102,0.12); color: #1b7a3d; }
    .wa-auto-hint { margin-top: 10px; }
    code { background: var(--luxe-offwhite); border: 1px solid var(--luxe-border); border-radius: 4px; padding: 1px 5px; font-size: 0.75rem; }

    .perms {
      margin: 0 0 22px; padding: 24px;
      background: var(--luxe-white); border: 1px solid var(--luxe-border);
      border-radius: 16px; box-shadow: var(--shadow-subtle);
    }
    .perm-create { display: flex; gap: 12px; align-items: center; margin: 18px 0 16px; flex-wrap: wrap; }
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

  whatsapp: WhatsAppSettings = { number: '', invite: true, notifyCustomer: false, providerReady: false, autoSend: false };
  whatsappNumber = '';
  whatsappInvite = true;
  notifyCustomer = false;
  savingNumber = false;
  savingInvite = false;
  savingNotify = false;

  loyaltyTiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS.map(t => ({ ...t }));
  savingLoyalty = false;

  permissionCatalog: PermissionDef[] = [
    { key: 'orders.update_status', section: 'Commandes', label: 'Changer le statut (attente, confirmée, expédiée, livrée)' },
    { key: 'orders.cancel', section: 'Commandes', label: 'Annuler une commande' },
    { key: 'products.manage', section: 'Catalogue', label: 'Créer et modifier les produits' },
    { key: 'stock.manage', section: 'Catalogue', label: 'Ajuster le stock' },
    { key: 'categories.manage', section: 'Catalogue', label: 'Gérer les catégories' }
  ];
  permissionGroups: PermissionGroup[] = [
    { id: 'admin', name: 'Administrateur', system: true, permissions: ['*'] },
    { id: 'seller', name: 'Employé', system: true, permissions: ['orders.update_status', 'orders.cancel', 'products.manage', 'stock.manage', 'categories.manage'] }
  ];
  newGroupName = '';
  savingPerms = false;

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
    }).catch(() => {});
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
        permissions: ['orders.update_status']
      }
    ];
    this.newGroupName = '';
    this.savePermissionGroups(`Groupe « ${name} » créé`);
  }

  removeGroup(group: PermissionGroup) {
    if (group.system || this.savingPerms) return;
    if (!confirm(`Supprimer le groupe « ${group.name} » ? Les employés concernés repasseront sur Employé.`)) return;
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

  saveWhatsAppInvite() {
    this.savingInvite = true;
    this.settings.save({ whatsappInvite: this.whatsappInvite }).then(() => {
      this.savingInvite = false;
      this.snackBar.open(
        this.whatsappInvite
          ? 'WhatsApp proposé au client après commande'
          : 'Pas d’invitation WhatsApp — la commande reste en attente dans Commandes',
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
