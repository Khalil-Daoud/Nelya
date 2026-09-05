import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface Crumb {
  label: string;
  url?: string;
  queryParams?: any;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <nav class="luxe-crumbs" aria-label="Fil d'Ariane">
      <a routerLink="/">Accueil</a>
      <mat-icon>chevron_right</mat-icon>
      <ng-container *ngFor="let crumb of crumbs; let last = last">
        <a *ngIf="crumb.url && !last" [routerLink]="crumb.url" [queryParams]="crumb.queryParams">{{ crumb.label }}</a>
        <span *ngIf="!crumb.url || last" class="current">{{ crumb.label }}</span>
        <mat-icon *ngIf="!last">chevron_right</mat-icon>
      </ng-container>
    </nav>
  `,
  styles: [`
    .luxe-crumbs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.78rem; letter-spacing: 0.5px; color: var(--luxe-text-muted); }
    .luxe-crumbs a { color: var(--luxe-text-muted); text-decoration: none; transition: color 0.3s ease; }
    .luxe-crumbs a:hover { color: var(--luxe-gold); }
    .luxe-crumbs .current { color: var(--luxe-black); font-weight: 500; }
    .luxe-crumbs mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--luxe-text-muted); }
  `]
})
export class BreadcrumbComponent {
  @Input() crumbs: Crumb[] = [];
}
