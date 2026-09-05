import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatFormFieldModule, MatInputModule, MatSelectModule, BreadcrumbComponent],
  template: `
    <div class="contact-page">
      <div class="container">
        <div class="contact-crumbs">
          <app-breadcrumb [crumbs]="[{label: 'Accueil', url: '/'}, {label: 'Contact'}]"></app-breadcrumb>
        </div>

        <div class="contact-head">
          <span class="contact-eyebrow">Nous sommes à votre écoute</span>
          <h1>Contactez l'atelier Nelya</h1>
          <p>Une question sur nos soins, votre commande ou un conseil beauté ? Notre équipe vous répond sous 24h ouvrées.</p>
        </div>

        <div class="contact-grid">
          <div class="contact-infos">
            <div class="contact-card">
              <mat-icon>mail_outline</mat-icon>
              <div>
                <strong>E-mail</strong>
                <p>contact&#64;nelya.tn</p>
                <p>commandes&#64;nelya.tn</p>
              </div>
            </div>
            <div class="contact-card">
              <mat-icon>phone_in_talk</mat-icon>
              <div>
                <strong>Téléphone</strong>
                <p>+216 22 580 632</p>
                <p>Du lundi au samedi, 9h &ndash; 18h</p>
              </div>
            </div>
            <div class="contact-card">
              <mat-icon>location_on</mat-icon>
              <div>
                <strong>Atelier</strong>
                <p>Immeuble Khalsa, Hammam Chott<br>Tunisie 2084</p>
              </div>
            </div>
            <div class="contact-socials">
              <a href="https://www.facebook.com/profile.php?id=61551180391546" target="_blank" rel="noopener" aria-label="Facebook"><mat-icon>facebook</mat-icon></a>
              <a href="#" aria-label="Instagram"><mat-icon>instagram</mat-icon></a>
              <a href="#" aria-label="TikTok"><mat-icon>music_note</mat-icon></a>
            </div>
          </div>

          <form class="contact-form" (submit)="send(form.value); $event.preventDefault()" #form="ngForm">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Nom complet</mat-label>
                <input matInput name="name" ngModel required placeholder="Votre nom">
              </mat-form-field>
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>E-mail</mat-label>
                <input matInput name="email" ngModel required type="email" placeholder="vous&#64;exemple.com">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="form-field full">
              <mat-label>Sujet</mat-label>
              <mat-select name="subject" ngModel required>
                <mat-option value="conseil">Conseil beauté</mat-option>
                <mat-option value="commande">Ma commande</mat-option>
                <mat-option value="livraison">Livraison & retours</mat-option>
                <mat-option value="partenariat">Partenariat</mat-option>
                <mat-option value="autre">Autre demande</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="form-field full">
              <mat-label>Votre message</mat-label>
              <textarea matInput name="message" ngModel required rows="6" placeholder="Décrivez votre demande..."></textarea>
            </mat-form-field>
            <button mat-flat-button color="primary" class="contact-submit" type="submit" [disabled]="!form.valid">
              <mat-icon>send</mat-icon> ENVOYER LE MESSAGE
            </button>
            <p class="contact-note">Vos données restent confidentielles et ne sont jamais partagées.</p>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contact-page { padding: 170px 0 40px; min-height: 70vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; }
    .contact-crumbs { margin-bottom: 46px; }

    .contact-head { text-align: center; margin-bottom: 70px; }
    .contact-eyebrow { font-size: 0.75rem; letter-spacing: 5px; text-transform: uppercase; color: var(--luxe-gold); font-weight: 600; }
    .contact-head h1 { font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 3rem); color: var(--luxe-black); margin: 18px 0 16px; font-weight: 500; }
    .contact-head p { color: var(--luxe-text-muted); max-width: 560px; margin: 0 auto; font-weight: 300; line-height: 1.8; }

    .contact-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 70px; align-items: start; }

    .contact-card {
      display: flex; gap: 18px; padding: 24px 0; border-bottom: 1px solid var(--luxe-border);
    }
    .contact-card mat-icon { color: var(--luxe-gold); font-size: 28px; width: 28px; height: 28px; margin-top: 2px; }
    .contact-card strong { color: var(--luxe-black); font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; }
    .contact-card p { color: var(--luxe-text-muted); margin: 8px 0 0; font-weight: 300; line-height: 1.7; font-size: 0.95rem; }
    .contact-socials { display: flex; gap: 14px; margin-top: 28px; }
    .contact-socials a {
      width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--luxe-border);
      display: flex; align-items: center; justify-content: center; color: var(--luxe-charcoal);
      transition: all 0.3s ease;
    }
    .contact-socials a mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .contact-socials a:hover { background: var(--luxe-gold); border-color: var(--luxe-gold); color: var(--luxe-black); transform: translateY(-3px); }

    .contact-form { background: var(--luxe-white); border: 1px solid var(--luxe-border); border-radius: var(--radius-lg); padding: 40px; box-shadow: var(--shadow-sm); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-field { width: 100%; margin-bottom: 20px; }
    .contact-submit { width: 100%; height: 56px; letter-spacing: 2px; font-size: 0.85rem; }
    .contact-submit mat-icon { margin-right: 8px; }
    .contact-note { text-align: center; color: var(--luxe-text-muted); font-size: 0.78rem; margin: 18px 0 0; }

    @media (max-width: 960px) {
      .contact-page { padding: 140px 0 30px; }
      .contact-grid { grid-template-columns: 1fr; gap: 50px; }
      .container { padding: 0 20px; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class ContactComponent {
  constructor(private snackBar: MatSnackBar) {}

  send(data: any) {
    this.snackBar.open('Merci pour votre message ! Nous vous répondrons sous 24h ouvrées.', 'Fermer', { duration: 4500 });
  }
}
