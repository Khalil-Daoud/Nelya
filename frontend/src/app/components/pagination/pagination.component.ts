import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="luxe-pagination" *ngIf="totalItems > 0">
      <span class="page-info">
        {{ start }}&ndash;{{ end }} sur <strong>{{ totalItems }}</strong>
      </span>
      <div class="page-controls">
        <button class="page-btn" (click)="goTo(pageIndex - 1)" [disabled]="pageIndex === 0" aria-label="Page précédente">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button class="page-num" *ngFor="let p of pageNumbers" [class.active]="p === pageIndex" (click)="goTo(p)">
          {{ p + 1 }}
        </button>
        <button class="page-btn" (click)="goTo(pageIndex + 1)" [disabled]="pageIndex >= pageCount - 1" aria-label="Page suivante">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .luxe-pagination {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 18px 24px; border-top: 1px solid var(--luxe-border);
      flex-wrap: wrap;
    }
    .page-info { color: var(--luxe-text-muted); font-size: 0.85rem; }
    .page-info strong { color: var(--luxe-black); }
    .page-controls { display: flex; align-items: center; gap: 6px; }
    .page-btn, .page-num {
      width: 36px; height: 36px; border-radius: var(--radius-sm);
      border: 1px solid var(--luxe-border); background: var(--luxe-white);
      color: var(--luxe-charcoal); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.82rem; font-weight: 500; transition: all 0.25s ease;
    }
    .page-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .page-btn:hover:not(:disabled), .page-num:hover { border-color: var(--luxe-gold); color: var(--luxe-gold); }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .page-num.active { background: var(--luxe-black); border-color: var(--luxe-black); color: var(--luxe-gold); }
  `]
})
export class PaginationComponent {
  @Input() pageIndex = 0;
  @Input() pageSize = 8;
  @Input() totalItems = 0;
  @Output() pageChange = new EventEmitter<number>();

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get start(): number {
    return this.totalItems === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get end(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalItems);
  }

  get pageNumbers(): number[] {
    const count = this.pageCount;
    const current = this.pageIndex;
    const nums: number[] = [];
    const min = Math.max(0, Math.min(current - 2, count - 5));
    const max = Math.min(count, min + 5);
    for (let i = min; i < max; i++) nums.push(i);
    return nums;
  }

  goTo(index: number) {
    const clamped = Math.max(0, Math.min(index, this.pageCount - 1));
    if (clamped !== this.pageIndex) {
      this.pageChange.emit(clamped);
    }
  }
}
