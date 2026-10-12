import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  constructor(private dialog: MatDialog) {}

  ask(data: ConfirmDialogData): Promise<boolean> {
    return firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        panelClass: 'luxury-dialog',
        width: '440px',
        data,
        autoFocus: false,
        hasBackdrop: true,
        restoreFocus: false
      }).afterClosed()
    ).then((ok) => ok === true);
  }
}
