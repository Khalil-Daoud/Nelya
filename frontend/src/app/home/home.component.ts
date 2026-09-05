import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CrudService } from '../services/crud.service';
import { ProductCardComponent } from '../components/product-card/product-card.component';
import { ImageUrlPipe } from '../pipes/image-url.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule, ProductCardComponent, ImageUrlPipe],
  template: `
    <div class="home-wrapper">
      <!-- HERO -->
      <section class="luxe-hero">
        <div class="luxe-hero-media">
          <img src="https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=2000" alt="Cosmétiques naturels Nelya">
        </div>
        <div class="luxe-hero-overlay"></div>
        <div class="luxe-hero-content">
          <span class="luxe-hero-tag fade-in-down">NELYA &mdash; TUNISIE</span>
          <h1 class="luxe-hero-title fade-in">L'Éclat du<br><em>Naturel</em></h1>
          <p class="luxe-hero-sub fade-in">Des soins botaniques d'exception, formulés avec passion pour révéler votre beauté intérieure.</p>
          <div class="luxe-hero-cta fade-in">
            <button mat-flat-button color="primary" routerLink="/collection">DÉCOUVRIR LA BOUTIQUE</button>
            <a class="luxe-hero-link" routerLink="/collection" [queryParams]="{cat: 'Soins'}">Nos soins <mat-icon>arrow_forward</mat-icon></a>
          </div>
        </div>
        <div class="luxe-hero-stats fade-in">
          <div class="stat"><span class="stat-num">100%</span><span class="stat-label">Naturel</span></div>
          <div class="stat"><span class="stat-num">+30</span><span class="stat-label">Soins exclusifs</span></div>
          <div class="stat"><span class="stat-num">0</span><span class="stat-label">Composants nocifs</span></div>
        </div>
      </section>

      <!-- USPs -->
      <section class="luxe-usps">
        <div class="luxe-usps-grid container">
          <div class="usp">
            <mat-icon>local_shipping</mat-icon>
            <div><strong>Livraison partout</strong><span>En Tunisie en 48h</span></div>
          </div>
          <div class="usp">
            <mat-icon>verified_user</mat-icon>
            <div><strong>Paiement sécurisé</strong><span>Transaction protégée</span></div>
          </div>
          <div class="usp">
            <mat-icon>recycling</mat-icon>
            <div><strong>Éco-responsable</strong><span>Emballages recyclables</span></div>
          </div>
          <div class="usp">
            <mat-icon>support_agent</mat-icon>
            <div><strong>Conseils d'expertes</strong><span>Une équipe à votre écoute</span></div>
          </div>
        </div>
      </section>

      <!-- CATEGORIES -->
      <section class="luxe-categories container">
        <div class="luxe-sec-head">
          <span class="luxe-sec-eyebrow">Nos univers</span>
          <h2 class="luxe-sec-title">Explorez par envie</h2>
          <div class="luxe-sec-line"></div>
        </div>
        <div class="luxe-cat-grid stagger" *ngIf="categories.length">
          <a class="luxe-cat-tile" *ngFor="let cat of categories" [routerLink]="['/collection']" [queryParams]="{cat: cat.name}">
            <img [src]="cat.image | imageUrl" [alt]="cat.name" loading="lazy">
            <div class="luxe-cat-shade"></div>
            <div class="luxe-cat-info">
              <span class="luxe-cat-name">{{ cat.name }}</span>
              <span class="luxe-cat-link">Découvrir <mat-icon>arrow_forward</mat-icon></span>
            </div>
          </a>
        </div>
      </section>

      <!-- PRODUITS VEDETTES -->
      <section class="luxe-featured">
        <div class="container">
          <div class="luxe-sec-head">
            <span class="luxe-sec-eyebrow">Sélection</span>
            <h2 class="luxe-sec-title">Nos meilleurs choix</h2>
            <div class="luxe-sec-line"></div>
          </div>
          <div class="luxe-prod-grid stagger">
            <app-product-card *ngFor="let product of products" [product]="product"></app-product-card>
          </div>
          <div class="luxe-see-all">
            <button mat-stroked-button routerLink="/collection">VOIR TOUTE LA COLLECTION</button>
          </div>
        </div>
      </section>

      <!-- ATELIER -->
      <section class="luxe-atelier">
        <div class="luxe-atelier-grid">
          <div class="luxe-atelier-media">
            <img src="/img/huile.jpg" alt="L'Atelier Nelya">
          </div>
          <div class="luxe-atelier-body">
            <span class="luxe-sec-eyebrow">Savoir-faire</span>
            <h2 class="luxe-atelier-title">L'Atelier Nelya</h2>
            <p>C'est ici, au cœur de notre atelier, que la magie opère. Nous sélectionnons les essences les plus pures pour créer des soins uniques, respectueux de votre peau et de la nature.</p>
            <ul class="luxe-atelier-list">
              <li><mat-icon>check_circle</mat-icon> Ingrédients d'origine naturelle</li>
              <li><mat-icon>check_circle</mat-icon> Formulation artisanale</li>
              <li><mat-icon>check_circle</mat-icon> Production tunisienne</li>
            </ul>
            <button mat-button class="luxe-text-link" routerLink="/collection">DÉCOUVRIR NOS SECRETS <mat-icon>east</mat-icon></button>
          </div>
        </div>
      </section>

      <!-- TÉMOIGNAGE -->
      <section class="luxe-quote container">
        <mat-icon class="luxe-quote-mark">format_quote</mat-icon>
        <blockquote>« J'ai enfin trouvé des soins qui respectent ma peau tout en m'offrant un vrai moment de luxe. Le rituel Nelya est devenu mon moment préféré. »</blockquote>
        <div class="luxe-quote-author">
          <span class="luxe-quote-name">Sarah B.</span>
          <span class="luxe-quote-role">Cliente fidèle</span>
          <div class="luxe-stars">
            <mat-icon>star</mat-icon><mat-icon>star</mat-icon><mat-icon>star</mat-icon><mat-icon>star</mat-icon><mat-icon>star</mat-icon>
          </div>
        </div>
      </section>

      <!-- NEWSLETTER -->
      <section class="luxe-newsletter">
        <div class="container luxe-newsletter-inner">
          <h3>REJOIGNEZ LE CLUB NELYA</h3>
          <p>Recevez nos offres exclusives et conseils beauté directement dans votre boîte mail.</p>
          <form class="luxe-subscribe" (submit)="subscribe(email.value); $event.preventDefault()">
            <input #email type="email" required placeholder="Votre adresse email" aria-label="Votre adresse email">
            <button mat-flat-button color="primary" type="submit">S'INSCRIRE</button>
          </form>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-wrapper { background: var(--luxe-white); overflow: hidden; }

    /* HERO */
    .luxe-hero { position: relative; height: 100vh; min-height: 620px; display: flex; align-items: center; justify-content: center; }
    .luxe-hero-media { position: absolute; inset: 0; }
    .luxe-hero-media img { width: 100%; height: 100%; object-fit: cover; }
    .luxe-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.55)); }
    .luxe-hero-content { position: relative; z-index: 2; text-align: center; color: var(--luxe-white); max-width: 900px; padding: 100px 24px 0; }
    .luxe-hero-tag { font-size: 0.8rem; letter-spacing: 7px; font-weight: 500; color: var(--luxe-gold); text-transform: uppercase; }
    .luxe-hero-title { font-family: var(--font-heading); font-size: clamp(3.4rem, 9vw, 6.5rem); font-weight: 500; line-height: 1.05; margin: 26px 0; text-shadow: 0 6px 30px rgba(0,0,0,0.4); }
    .luxe-hero-title em { font-style: italic; color: var(--luxe-gold); }
    .luxe-hero-sub { font-size: clamp(1rem, 2vw, 1.25rem); font-weight: 300; max-width: 600px; margin: 0 auto 45px; line-height: 1.8; font-family: var(--font-body); opacity: 0.95; }
    .luxe-hero-cta { display: flex; align-items: center; justify-content: center; gap: 30px; flex-wrap: wrap; }
    .luxe-hero-cta button { padding: 0 36px; height: 54px; font-size: 0.78rem; letter-spacing: 2px; }
    .luxe-hero-link { color: var(--luxe-white); text-decoration: none; font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--luxe-gold); padding-bottom: 6px; transition: color 0.3s ease; }
    .luxe-hero-link:hover { color: var(--luxe-gold); }
    .luxe-hero-stats {
      position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
      display: flex; justify-content: center; gap: 0;
      background: rgba(10,10,10,0.55); backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .stat { flex: 1; max-width: 280px; padding: 26px 20px; text-align: center; border-right: 1px solid rgba(255,255,255,0.12); display: flex; flex-direction: column; gap: 6px; }
    .stat:last-child { border-right: none; }
    .stat-num { font-family: var(--font-heading); font-size: 1.8rem; color: var(--luxe-gold); }
    .stat-label { font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.85); font-weight: 300; }

    /* USPs */
    .luxe-usps { border-bottom: 1px solid var(--luxe-border); }
    .luxe-usps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 34px 40px; }
    .usp { display: flex; align-items: center; gap: 16px; }
    .usp mat-icon { color: var(--luxe-gold); font-size: 34px; width: 34px; height: 34px; }
    .usp strong { display: block; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--luxe-black); font-weight: 600; margin-bottom: 3px; }
    .usp span { font-size: 0.78rem; color: var(--luxe-text-muted); font-weight: 300; }

    /* Sections communes */
    .container { max-width: 1440px; margin: 0 auto; padding: 0 40px; }
    .luxe-sec-head { text-align: center; margin-bottom: 60px; }
    .luxe-sec-eyebrow { font-size: 0.75rem; letter-spacing: 5px; text-transform: uppercase; color: var(--luxe-gold); font-weight: 600; }
    .luxe-sec-title { font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 2.8rem); color: var(--luxe-black); margin: 18px 0 0; font-weight: 500; }
    .luxe-sec-line { width: 46px; height: 2px; background: var(--luxe-gold); margin: 24px auto 0; border-radius: 2px; }

    /* Catégories */
    .luxe-categories { padding: 110px 40px 40px; }
    .luxe-cat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 26px; }
    .luxe-cat-tile { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius-lg); text-decoration: none; display: block; }
    .luxe-cat-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .luxe-cat-tile:hover img { transform: scale(1.06); }
    .luxe-cat-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,10,10,0.75), rgba(10,10,10,0.05)); }
    .luxe-cat-info { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px; display: flex; flex-direction: column; gap: 6px; }
    .luxe-cat-name { color: var(--luxe-white); font-family: var(--font-heading); font-size: 1.35rem; }
    .luxe-cat-link { color: var(--luxe-gold); font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; opacity: 0.9; transition: opacity 0.3s ease; }
    .luxe-cat-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .luxe-cat-tile:hover .luxe-cat-link { opacity: 1; }

    /* Produits vedettes */
    .luxe-featured { padding: 110px 0 60px; }
    .luxe-prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 34px; }
    .luxe-see-all { text-align: center; margin-top: 60px; }
    .luxe-see-all button { padding: 0 40px; height: 52px; letter-spacing: 2px; }

    /* Atelier */
    .luxe-atelier { background: var(--luxe-black); color: var(--luxe-white); margin-top: 110px; overflow: hidden; }
    .luxe-atelier-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .luxe-atelier-media { min-height: 560px; }
    .luxe-atelier-media img { width: 100%; height: 100%; object-fit: cover; opacity: 0.92; }
    .luxe-atelier-body { padding: clamp(50px, 8vw, 110px); display: flex; flex-direction: column; justify-content: center; }
    .luxe-atelier-title { font-family: var(--font-heading); font-size: clamp(2.4rem, 5vw, 3.6rem); color: var(--luxe-white); margin: 22px 0 30px; font-weight: 500; }
    .luxe-atelier-body p { color: #bbbbbb; font-size: 1.05rem; line-height: 1.9; font-weight: 300; font-family: var(--font-body); }
    .luxe-atelier-list { list-style: none; padding: 0; margin: 34px 0 44px; display: flex; flex-direction: column; gap: 14px; }
    .luxe-atelier-list li { display: flex; align-items: center; gap: 12px; color: #cccccc; font-size: 0.95rem; font-weight: 300; }
    .luxe-atelier-list mat-icon { color: var(--luxe-gold); font-size: 20px; width: 20px; height: 20px; }
    .luxe-text-link { color: var(--luxe-gold); letter-spacing: 2px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 10px; }
    .luxe-text-link:hover { color: var(--luxe-white); }

    /* Témoignage */
    .luxe-quote { text-align: center; padding: 120px 40px; max-width: 900px; }
    .luxe-quote-mark { color: var(--luxe-gold); font-size: 64px; width: 64px; height: 64px; }
    .luxe-quote blockquote { font-family: var(--font-heading); font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.6; color: var(--luxe-black); margin: 24px auto 36px; font-weight: 400; }
    .luxe-quote-author { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .luxe-quote-name { font-weight: 600; color: var(--luxe-black); letter-spacing: 1px; }
    .luxe-quote-role { font-size: 0.75rem; color: var(--luxe-text-muted); text-transform: uppercase; letter-spacing: 2px; }
    .luxe-stars { display: flex; gap: 4px; margin-top: 8px; }
    .luxe-stars mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--luxe-gold); }

    /* Newsletter */
    .luxe-newsletter { background: var(--luxe-offwhite); border-top: 1px solid var(--luxe-border); padding: 110px 40px; }
    .luxe-newsletter-inner { text-align: center; max-width: 640px; }
    .luxe-newsletter h3 { font-size: clamp(1.5rem, 3vw, 2rem); letter-spacing: 4px; text-transform: uppercase; color: var(--luxe-black); margin-bottom: 18px; font-family: var(--font-heading); font-weight: 500; }
    .luxe-newsletter p { color: var(--luxe-text-muted); margin-bottom: 40px; font-weight: 300; line-height: 1.7; }
    .luxe-subscribe { display: flex; gap: 0; box-shadow: var(--shadow-sm); border-radius: var(--radius-pill); overflow: hidden; background: var(--luxe-white); }
    .luxe-subscribe input { flex: 1; padding: 16px 26px; border: none; outline: none; font-family: var(--font-body); font-size: 0.9rem; }
    .luxe-subscribe button { border-radius: 0 !important; height: auto; letter-spacing: 2px; }

    @media (max-width: 960px) {
      .container, .luxe-categories { padding-left: 20px; padding-right: 20px; }
      .luxe-usps-grid { grid-template-columns: 1fr 1fr; padding: 28px 20px; }
      .luxe-atelier-grid { grid-template-columns: 1fr; }
      .luxe-atelier-media { min-height: 340px; }
      .luxe-atelier-body { padding: 50px 26px; }
      .luxe-hero-stats { flex-wrap: wrap; }
      .stat { max-width: 50%; border-bottom: 1px solid rgba(255,255,255,0.12); }
      .stat:nth-child(2n) { border-right: none; }
      .luxe-subscribe { flex-direction: column; border-radius: var(--radius-lg); }
      .luxe-subscribe input { padding: 18px 22px; }
    }
  `]
})
export class HomeComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];

  constructor(private crud: CrudService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.crud.getAll<any>('products').subscribe({
      next: data => {
        this.products = data.slice(0, 8);
        const seen: any = {};
        const cats: any[] = [];
        for (const p of data) {
          if (p.category && p.category !== 'Promotions' && !seen[p.category]) {
            seen[p.category] = true;
            cats.push({ name: p.category, image: p.image_url });
          }
          if (cats.length === 4) break;
        }
        this.categories = cats;
      },
      error: () => {}
    });
  }

  subscribe(email: string) {
    this.snackBar.open('Merci ! Votre inscription à la newsletter a bien été enregistrée.', 'Fermer', { duration: 3500 });
  }
}
