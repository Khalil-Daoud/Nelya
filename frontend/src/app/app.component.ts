import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';

// Sections avec leur propre layout complet (sidebar admin, écrans d'auth plein écran...)
// Elles ne doivent pas hériter du header/footer de la boutique publique.
const STANDALONE_LAYOUT_PREFIXES = ['/admin', '/auth'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header *ngIf="showShopChrome"></app-header>
    <main [class.no-chrome]="!showShopChrome">
      <router-outlet></router-outlet>
    </main>
    <app-footer *ngIf="showShopChrome"></app-footer>
  `,
  styles: [`
    :host { display: block; }
    main { min-height: 70vh; }
    main.no-chrome { min-height: 100vh; }
  `]
})
export class AppComponent implements OnInit {
  showShopChrome = true;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      this.showShopChrome = !STANDALONE_LAYOUT_PREFIXES.some(prefix => url.startsWith(prefix));
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    });
  }
}
