import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { filter } from 'rxjs/operators';
import { AuthService, User } from '../services/auth.service';

const COLLAPSE_KEY = 'nelya_admin_collapsed';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule],
  template: `
    <div class="admin-shell">
      <aside class="sidebar" [class.collapsed]="collapsed" [class.open]="sidebarOpen">
        <div class="sidebar-brand">
          <span class="brand-logo" routerLink="/">NELYA</span>
          <span class="brand-sub">ADMIN</span>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item" matTooltip="Vue d'ensemble" matTooltipPosition="right">
            <mat-icon>space_dashboard</mat-icon>
            <span>Vue d'ensemble</span>
          </a>
          <a routerLink="/admin/orders" routerLinkActive="active" class="nav-item" matTooltip="Commandes" matTooltipPosition="right">
            <mat-icon>shopping_cart</mat-icon>
            <span>Commandes</span>
          </a>
          <a routerLink="/admin/products" routerLinkActive="active" class="nav-item" matTooltip="Produits" matTooltipPosition="right">
            <mat-icon>inventory_2</mat-icon>
            <span>Produits</span>
          </a>
          <a routerLink="/admin/categories" routerLinkActive="active" class="nav-item" matTooltip="Catégories" matTooltipPosition="right">
            <mat-icon>category</mat-icon>
            <span>Catégories</span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item" *ngIf="isAdmin" matTooltip="Clients & Employés" matTooltipPosition="right">
            <mat-icon>group</mat-icon>
            <span>Clients & Employés</span>
          </a>
          <a routerLink="/admin/settings" routerLinkActive="active" class="nav-item" *ngIf="isAdmin" matTooltip="Paramètres" matTooltipPosition="right">
            <mat-icon>settings</mat-icon>
            <span>Paramètres</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="admin-user">
            <div class="avatar">{{ userInitial }}</div>
            <div class="user-meta">
              <span class="user-name">{{ userName }}</span>
              <span class="user-role">{{ userRole }}</span>
            </div>
          </div>
          <div class="sidebar-actions">
            <button mat-icon-button matTooltip="Voir la boutique" routerLink="/" class="footer-btn">
              <mat-icon>storefront</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Déconnexion" (click)="logout()" class="footer-btn">
              <mat-icon>logout</mat-icon>
            </button>
          </div>
        </div>
      </aside>
      <div class="sidebar-scrim" *ngIf="sidebarOpen" (click)="sidebarOpen = false"></div>

      <main class="admin-main">
        <header class="topbar">
          <div class="topbar-left">
            <button mat-icon-button class="sidebar-toggle" (click)="toggleSidebar()" matTooltip="Réduire / agrandir le menu">
              <mat-icon>{{ collapsed ? 'menu_open' : 'menu' }}</mat-icon>
            </button>
            <div class="page-title">
              <span class="page-eyebrow">ESPACE {{ isAdmin ? 'ADMINISTRATION' : 'EMPLOYÉ' }}</span>
              <h1>{{ pageTitle }}</h1>
            </div>
          </div>

          <div class="topbar-right">
            <button mat-icon-button routerLink="/" matTooltip="Voir la boutique" class="topbar-icon-btn">
              <mat-icon>storefront</mat-icon>
            </button>
            <button mat-icon-button routerLink="/cart" matTooltip="Panier" class="topbar-icon-btn">
              <mat-icon>shopping_bag_outlined</mat-icon>
            </button>
            <button class="user-chip" [matMenuTriggerFor]="userMenu">
              <span class="user-chip-avatar">{{ userInitial }}</span>
              <span class="user-chip-meta">
                <span class="user-chip-name">{{ userName }}</span>
                <span class="user-chip-role">{{ userRole }}</span>
              </span>
              <mat-icon class="user-chip-caret">expand_more</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu" xPosition="before">
              <button mat-menu-item routerLink="/profile"><mat-icon>account_circle</mat-icon> Mon profil</button>
              <button mat-menu-item routerLink="/"><mat-icon>storefront</mat-icon> Voir la boutique</button>
              <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon> Déconnexion</button>
            </mat-menu>
          </div>
        </header>

        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell { display: flex; min-height: 100vh; background: var(--luxe-offwhite); }

    /* SIDEBAR */
    .sidebar {
      width: 260px; flex-shrink: 0; background: var(--luxe-black); color: var(--luxe-white);
      display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
      transition: width 0.3s ease; overflow: hidden;
      z-index: 900;
    }
    .sidebar.collapsed { width: 78px; }
    .sidebar.collapsed .brand-sub, .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .user-meta, .sidebar.collapsed .sidebar-actions { display: none; }
    .sidebar.collapsed .brand-logo { text-align: center; font-size: 1rem; letter-spacing: 3px; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 15px; }
    .sidebar.collapsed .admin-user { justify-content: center; }

    .sidebar-brand { padding: 34px 30px 26px; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
    .brand-logo { display: block; font-family: var(--font-heading); font-size: 1.5rem; letter-spacing: 8px; color: var(--luxe-white); cursor: pointer; }
    .brand-sub { display: block; margin-top: 6px; font-size: 0.62rem; letter-spacing: 4px; color: var(--luxe-gold); font-weight: 600; }

    .sidebar-nav { flex: 1; padding: 25px 15px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 15px; padding: 13px 18px; border-radius: var(--radius-sm);
      color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; letter-spacing: 1px;
      font-weight: 400; transition: background 0.3s ease, color 0.3s ease; white-space: nowrap;
    }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .nav-item:hover { color: var(--luxe-white); background: rgba(255,255,255,0.06); }
    .nav-item.active { color: var(--luxe-black); background: var(--luxe-gold); font-weight: 600; }

    .sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.08); }
    .admin-user { display: flex; align-items: center; gap: 12px; padding: 10px 8px; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--luxe-gold); color: var(--luxe-black); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .user-meta { flex: 1; min-width: 0; }
    .user-name { display: block; font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { display: block; font-size: 0.68rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
    .sidebar-actions { display: flex; gap: 10px; padding: 8px; }
    .footer-btn { color: rgba(255,255,255,0.6); }
    .footer-btn:hover { color: var(--luxe-gold); }

    /* MAIN */
    .admin-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      height: 76px; background: var(--luxe-white); border-bottom: 1px solid var(--luxe-border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 32px; position: sticky; top: 0; z-index: 800; gap: 16px;
    }
    .topbar-left { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .sidebar-toggle { color: var(--luxe-charcoal); }
    .page-title { min-width: 0; }
    .page-eyebrow { display: block; font-size: 0.6rem; letter-spacing: 3px; color: var(--luxe-gold); font-weight: 700; text-transform: uppercase; }
    .page-title h1 { font-family: var(--font-heading); font-size: 1.4rem; color: var(--luxe-black); margin: 2px 0 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .topbar-right { display: flex; align-items: center; gap: 10px; }
    .topbar-icon-btn { color: var(--luxe-charcoal); }
    .topbar-icon-btn:hover { color: var(--luxe-gold); }
    .user-chip {
      display: flex; align-items: center; gap: 12px; margin-left: 8px;
      background: var(--luxe-offwhite); border: 1px solid var(--luxe-border);
      border-radius: var(--radius-pill); padding: 6px 16px 6px 6px; cursor: pointer;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .user-chip:hover { border-color: var(--luxe-gold); background: var(--luxe-white); }
    .user-chip-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--luxe-black); color: var(--luxe-gold); display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .user-chip-meta { display: flex; flex-direction: column; text-align: left; }
    .user-chip-name { font-size: 0.82rem; font-weight: 600; color: var(--luxe-black); line-height: 1.2; }
    .user-chip-role { font-size: 0.66rem; color: var(--luxe-text-muted); text-transform: uppercase; letter-spacing: 1px; }
    .user-chip-caret { font-size: 18px; width: 18px; height: 18px; color: var(--luxe-text-muted); }

    .admin-content { padding: 36px 32px 60px; flex: 1; }

    .sidebar-scrim { display: none; }

    @media (max-width: 960px) {
      .sidebar {
        position: fixed; left: 0; top: 0; bottom: 0; width: 260px;
        transform: translateX(-100%); transition: transform 0.35s ease;
        box-shadow: var(--shadow-modal);
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar.collapsed { width: 260px; }
      .sidebar.collapsed .brand-sub, .sidebar.collapsed .nav-item span,
      .sidebar.collapsed .user-meta, .sidebar.collapsed .sidebar-actions { display: block; }
      .sidebar.collapsed .nav-item { justify-content: flex-start; padding: 13px 18px; }
      .sidebar.collapsed .brand-logo { text-align: left; font-size: 1.5rem; letter-spacing: 8px; }
      .sidebar.collapsed .admin-user { justify-content: flex-start; }
      .sidebar-scrim { display: block; position: fixed; inset: 0; background: rgba(10,10,10,0.45); z-index: 850; }
      .topbar { padding: 0 18px; }
      .admin-content { padding: 26px 18px 50px; }
      .user-chip-meta { display: none; }
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  user: User | null = null;
  isAdmin = false;
  collapsed = false;
  sidebarOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.isAdmin = user?.role === 'admin';
    });
    this.collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.sidebarOpen = false;
    });
  }

  toggleSidebar() {
    this.sidebarOpen = true;
    this.collapsed = !this.collapsed;
    localStorage.setItem(COLLAPSE_KEY, this.collapsed ? '1' : '0');
  }

  get pageTitle(): string {
    const seg = this.router.url.split('?')[0].split('/').filter(Boolean).pop() || 'dashboard';
    const titles: any = {
      dashboard: 'Vue d\'ensemble',
      orders: 'Commandes',
      products: 'Produits',
      categories: 'Catégories',
      users: 'Clients & Employés',
      settings: 'Paramètres'
    };
    return titles[seg] || 'Espace administrateur';
  }

  get userName(): string {
    return this.user ? `${this.user.first_name} ${this.user.last_name}` : '';
  }

  get userInitial(): string {
    return this.user?.first_name ? this.user.first_name[0].toUpperCase() : 'A';
  }

  get userRole(): string {
    return this.user?.role === 'admin' ? 'Administrateur' : this.user?.role === 'seller' ? 'Employé' : 'Client';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
