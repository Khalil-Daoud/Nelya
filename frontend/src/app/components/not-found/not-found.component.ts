import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="nf-page">
      <div class="nf-inner">
        <div class="nf-code">404</div>
        <span class="nf-tag">ERREUR</span>
        <h1>Cette page s'est égarée</h1>
        <p>La page que vous recherchez n'existe pas ou a été déplacée. Revenons sur le chemin du luxe.</p>
        <button mat-flat-button color="primary" routerLink="/">
          <mat-icon>arrow_back</mat-icon> RETOUR À L'ACCUEIL
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nf-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--luxe-white); text-align: center; padding: 120px 20px 40px;
    }
    .nf-code {
      font-family: var(--font-heading); font-size: clamp(6rem, 20vw, 12rem);
      font-weight: 700; line-height: 1; color: transparent;
      -webkit-background-clip: text; background-clip: text;
      background-image: linear-gradient(135deg, var(--luxe-black) 30%, var(--luxe-gold));
    }
    .nf-tag { display: block; letter-spacing: 8px; font-size: 0.75rem; font-weight: 600; color: var(--luxe-gold); text-transform: uppercase; margin: 10px 0 24px; }
    .nf-inner h1 { font-family: var(--font-heading); font-size: 2.2rem; color: var(--luxe-black); margin-bottom: 16px; }
    .nf-inner p { color: var(--luxe-text-muted); max-width: 440px; margin: 0 auto 36px; line-height: 1.7; font-weight: 300; }
    .nf-inner button mat-icon { margin-right: 8px; }
  `]
})
export class NotFoundComponent {}
