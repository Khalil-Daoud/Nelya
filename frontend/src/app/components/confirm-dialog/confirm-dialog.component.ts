import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="box">
      <div class="icon" [class.danger]="data.danger">
        <mat-icon>{{ data.danger ? 'warning' : 'help' }}</mat-icon>
      </div>
      <h2>{{ data.title || (data.danger ? 'Confirmer la suppression' : 'Confirmation') }}</h2>
      <p>{{ data.message }}</p>
      <div class="actions">
        <button mat-button type="button" (click)="close(false)">{{ data.cancelLabel || 'Annuler' }}</button>
        <button mat-flat-button type="button" [color]="data.danger ? 'warn' : 'primary'" (click)="close(true)">
          {{ data.confirmLabel || (data.danger ? 'Supprimer' : 'Confirmer') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .box { padding: 32px 28px 24px; text-align: center; max-width: 420px; }
    .icon {
      width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--luxe-offwhite); border: 1px solid var(--luxe-border);
    }
    .icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--luxe-gold); }
    .icon.danger { background: #fef3f2; border-color: #fecdca; }
    .icon.danger mat-icon { color: #b42318; }
    h2 { font-family: var(--font-heading); font-size: 1.55rem; font-weight: 400; margin: 0 0 10px; color: var(--luxe-black); }
    p { margin: 0 0 24px; font-size: 0.92rem; font-weight: 300; line-height: 1.6; color: var(--luxe-charcoal); }
    .actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  close(value: boolean) {
    this.dialogRef.close(value);
  }
}
