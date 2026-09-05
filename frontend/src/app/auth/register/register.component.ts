import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="auth-page">
      <div class="auth-split-layout">
        <!-- Left Editorial Section -->
        <div class="brand-panel">
          <div class="brand-glow"></div>
          <div class="brand-content-wrapper">
            <h1 class="brand-logo-large">NELYA</h1>
            <p class="brand-tagline">L'Excellence de la Cosmétique & Soins de Luxe</p>
            <div class="line-gold"></div>
            <div class="brand-features">
              <div class="feature-item">
                <mat-icon>spa</mat-icon>
                <div class="feature-text">
                  <h4>Ingrédients Nobles</h4>
                  <p>Sélectionnés avec soin pour révéler votre éclat naturel.</p>
                </div>
              </div>
              <div class="feature-item">
                <mat-icon>auto_awesome</mat-icon>
                <div class="feature-text">
                  <h4>Savoir-faire Tunisien</h4>
                  <p>L'alliance parfaite de la tradition et de l'innovation.</p>
                </div>
              </div>
              <div class="feature-item">
                <mat-icon>verified</mat-icon>
                <div class="feature-text">
                  <h4>Formules Testées</h4>
                  <p>Une efficacité prouvée et des textures hautement sensorielles.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="brand-footer">
            <span>© 2026 NELYA. TOUS DROITS RÉSERVÉS</span>
          </div>
        </div>

        <!-- Right Form Section -->
        <div class="form-panel">
          <div class="form-container fade-in">
            <div class="mobile-logo">NELYA</div>
            <div class="form-header">
              <h2>Créer un compte</h2>
              <p>Rejoignez la communauté Nelya et profitez d'avantages exclusifs.</p>
            </div>
            
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="luxury-form">
              <div class="name-row">
                <mat-form-field appearance="outline">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="first_name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="last_name">
                </mat-form-field>
              </div>
    
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Adresse email</mat-label>
                <input matInput type="email" formControlName="email">
                <mat-icon matSuffix>mail</mat-icon>
              </mat-form-field>
    
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Mot de passe (min. 6 caractères)</mat-label>
                <input matInput type="password" formControlName="password">
                <mat-icon matSuffix>lock</mat-icon>
              </mat-form-field>
    
              <button mat-raised-button color="primary" type="submit" [disabled]="registerForm.invalid || isLoading" class="full-width register-btn">
                {{ isLoading ? 'CRÉATION EN COURS...' : "S'INSCRIRE" }}
              </button>
            </form>
            
            <div class="form-footer">
              <p>Déjà un compte ? <a routerLink="/auth/login">Connectez-vous ici</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      background: var(--luxe-white);
      font-family: var(--font-body);
    }
    .auth-split-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      width: 100%;
      min-height: 100vh;
    }
    .brand-panel {
      position: relative;
      background: linear-gradient(135deg, #0d0d0f 0%, #15151b 100%);
      color: var(--luxe-white);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 80px;
      overflow: hidden;
    }
    .brand-glow {
      position: absolute;
      top: -30%;
      right: -30%;
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, rgba(203, 161, 53, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
      border-radius: 50%;
      pointer-events: none;
    }
    .brand-content-wrapper {
      position: relative;
      z-index: 2;
      max-width: 500px;
      margin-top: auto;
      margin-bottom: auto;
    }
    .brand-logo-large {
      font-family: var(--font-heading);
      font-size: 3.5rem;
      letter-spacing: 12px;
      margin-bottom: 20px;
      font-weight: 400;
      line-height: 1.2;
      padding: 5px 0;
      background: linear-gradient(to right, #ffffff, var(--luxe-gold));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-tagline {
      font-size: 1.1rem;
      font-weight: 300;
      opacity: 0.85;
      letter-spacing: 1px;
      line-height: 1.6;
    }
    .line-gold {
      width: 60px;
      height: 1px;
      background: var(--luxe-gold);
      margin: 40px 0;
    }
    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 35px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }
    .feature-item mat-icon {
      color: var(--luxe-gold);
      font-size: 26px;
      width: 26px;
      height: 26px;
      margin-top: 2px;
    }
    .feature-text h4 {
      font-size: 1.05rem;
      font-weight: 500;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
      color: var(--luxe-white);
    }
    .feature-text p {
      font-size: 0.9rem;
      font-weight: 300;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      line-height: 1.5;
    }
    .brand-footer {
      font-size: 0.75rem;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.35);
      z-index: 2;
    }
    .form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
      background: var(--luxe-offwhite);
    }
    .form-container {
      width: 100%;
      max-width: 420px;
    }
    .mobile-logo {
      display: none;
      font-family: var(--font-heading);
      font-size: 2rem;
      letter-spacing: 6px;
      color: var(--luxe-black);
      text-align: center;
      margin-bottom: 40px;
    }
    .form-header {
      margin-bottom: 35px;
    }
    .form-header h2 {
      font-size: 2.2rem;
      font-family: var(--font-heading);
      font-weight: 400;
      margin-bottom: 10px;
      color: var(--luxe-black);
    }
    .form-header p {
      color: var(--luxe-text-muted);
      font-size: 0.95rem;
      font-weight: 300;
      margin: 0;
    }
    .luxury-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .full-width {
      width: 100%;
    }
    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .register-btn {
      height: 55px;
      margin-top: 20px;
      letter-spacing: 2px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.9rem !important;
      border-radius: var(--radius-sm) !important;
    }
    .form-footer {
      text-align: center;
      margin-top: 35px;
      font-size: 0.9rem;
      color: var(--luxe-charcoal);
    }
    .form-footer a {
      color: var(--luxe-gold);
      font-weight: 600;
      transition: var(--transition-smooth);
    }
    .form-footer a:hover {
      color: var(--luxe-black);
      text-decoration: underline;
    }
    @media (max-width: 1024px) {
      .auth-split-layout {
        grid-template-columns: 1fr;
      }
      .brand-panel {
        display: none;
      }
      .mobile-logo {
        display: block;
      }
      .form-panel {
        background: var(--luxe-white);
        padding: 40px 20px;
      }
    }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.snackBar.open('Compte créé avec succès !', 'Fermer', { duration: 3000 });
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Erreur lors de l\'inscription. L\'email est peut-être déjà utilisé.', 'Fermer', { duration: 5000 });
        }
      });
    }
  }
}
