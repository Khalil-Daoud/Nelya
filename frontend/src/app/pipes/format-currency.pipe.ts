import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';

@Pipe({
  name: 'formatCurrency',
  standalone: true,
  pure: false
})
export class FormatCurrencyPipe implements PipeTransform, OnDestroy {
  private symbol = '€';
  private sub: Subscription;

  constructor(private settings: SettingsService, private cdr: ChangeDetectorRef) {
    this.symbol = this.settings.currency.symbol;
    this.sub = this.settings.currency$.subscribe(c => {
      this.symbol = c.symbol;
      this.cdr.markForCheck();
    });
  }

  transform(value: any, digits = 2): string {
    const num = Number(value);
    if (isNaN(num)) return '';
    return `${num.toLocaleString('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })} ${this.symbol}`;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
